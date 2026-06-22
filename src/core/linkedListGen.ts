// ============================================================
// src/core/linkedListGen.ts — V7 空间暂存区原子化重构
//
// 核心改造：所有拓扑变化拆解为 4 个原子帧
//   1. 生成暂存节点（y=370 下方孤立）
//   2. 连接后继指针（对角斜线）
//   3. 断开并重连前驱指针（上下错位）
//   4. 空间位置重对齐（Kinematic Realignment, y→250, x 移位）
//
// 删除操作对称：目标节点下沉分离 → 断开指针 → 释放
// ============================================================

import type { AnimationState, Node, Pointer } from '@/types';

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ---- 布局常量 ----
const HEAD_X = 50;
const ROW_Y = 250;
const NODE_SPACING = 150;
const TEMP_OFFSET_X = 90;
const STAGE_Y = ROW_Y + 120; // 空间暂存区 Y 坐标（主链表下方 120px）

// ============================================================
// 0. 辅助函数
// ============================================================

function buildListFrame(values: number[], description: string): AnimationState {
  const nodes: Node[] = [
    { id: 'L', val: 'Head', x: HEAD_X, y: ROW_Y, type: 'head' },
  ];
  const pointers: Pointer[] = [];
  const nodeIds: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const nId = `n_${i}`;
    nodeIds.push(nId);
    nodes.push({
      id: nId, val: values[i],
      x: HEAD_X + NODE_SPACING + i * NODE_SPACING,
      y: ROW_Y, type: 'normal',
    });
  }

  if (nodeIds.length > 0) {
    pointers.push({ id: 'p_L_first', from: 'L', to: nodeIds[0], type: 'solid', label: 'next' });
  } else {
    pointers.push({ id: 'p_L_null', from: 'L', to: 'NULL', type: 'solid', label: 'next' });
  }

  for (let i = 0; i < nodeIds.length; i++) {
    const toId = i < nodeIds.length - 1 ? nodeIds[i + 1] : 'NULL';
    pointers.push({ id: `p_${nodeIds[i]}_next`, from: nodeIds[i], to: toId, type: 'solid', label: 'next' });
  }

  return { stepId: 0, codeLine: 1, description, variables: {}, nodes, pointers, highlights: [] };
}

// ============================================================
// 1. 头插法建表（原子化拆解）
// ============================================================

export function* generateHeadInsertStates(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;
  const currentListIds: string[] = [];

  const state: AnimationState = {
    stepId: 0, codeLine: 1,
    description: '初始化：准备开始头插法创建单链表。',
    variables: { pHead: 'L', pTemp: 'NULL', x: '?' },
    nodes: [{ id: 'L', val: 'Head', x: HEAD_X, y: ROW_Y, type: 'head' }],
    pointers: [{ id: 'p_L_null', from: 'L', to: 'NULL', type: 'solid', label: 'next' }],
    highlights: [],
    nodeCursors: { L: ['pHead'] },
  };
  yield clone(state);

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const sId = `s_${i}`;
    const nextTarget = currentListIds.length > 0 ? currentListIds[0] : 'NULL';

    // 读取输入
    state.codeLine = 15;
    state.stepId = stepCounter++;
    state.description = `读取输入数据 x = ${val}`;
    state.variables = { ...state.variables, x: String(val) };
    yield clone(state);

    // ──── 原子帧 1：生成暂存节点（下方孤立） ────
    state.codeLine = 12;
    state.stepId = stepCounter++;
    state.description = `执行 s = malloc：创建临时结点 pTemp，新结点先在暂存区出现，尚未改动任何 next 指针。`;
    state.variables = { ...state.variables, pTemp: `0x200${i}` };
    state.nodes = [
      ...state.nodes,
      { id: sId, val, x: HEAD_X + TEMP_OFFSET_X, y: STAGE_Y, type: 'normal' },
    ];
    state.nodeCursors = { L: ['pHead'], [sId]: ['pTemp'] };
    state.activeNodes = [sId];
    yield clone(state);

    state.codeLine = 13;
    state.stepId = stepCounter++;
    state.description = `执行 s->data = x：把 x=${val} 写入 pTemp 的 data 域。`;
    state.highlights = [sId];
    state.nodeCursors = { L: ['pHead'], [sId]: ['pTemp'] };
    yield clone(state);

    // ──── 原子帧 2：连接后继指针 ────
    state.codeLine = 14;
    state.stepId = stepCounter++;
    state.description =
      nextTarget === 'NULL'
        ? '执行 s->next = L->next：pTemp->next 指向原首元结点，此处原首元为 NULL。'
        : `执行 s->next = L->next：pTemp->next 先指向原首元结点 ${nextTarget}，节点仍停留在暂存区。`;
    state.pointers = [
      ...state.pointers,
      { id: `p_${sId}_next`, from: sId, to: nextTarget, type: 'dashed', label: 'next', active: true },
    ];
    state.nodeCursors = { L: ['pHead'], [sId]: ['pTemp'] };
    state.activePointers = [`p_${sId}_next`];
    yield clone(state);

    // ──── 原子帧 3：断开并重连前驱指针 ────
    state.codeLine = 15;
    state.stepId = stepCounter++;
    state.description = '执行 L->next = s：pHead->next 改为指向 pTemp，头结点到原首元结点的旧 next 指针断开。';
    state.pointers = state.pointers.filter((p) => p.from !== 'L');
    state.pointers = [
      ...state.pointers,
      { id: 'p_L_next', from: 'L', to: sId, type: 'solid', label: 'next', active: true },
    ];
    state.pointers = state.pointers.map((p) =>
      p.id === `p_${sId}_next` ? { ...p, type: 'solid' as const } : p,
    );
    state.nodeCursors = { L: ['pHead'], [sId]: ['pTemp'] };
    state.activePointers = ['p_L_next'];
    yield clone(state);

    // ──── 原子帧 4：空间位置重对齐 (Kinematic Realignment) ────
    state.codeLine = 10;
    state.stepId = stepCounter++;
    state.description = `指针赋值完成后整理布局：pTemp 平滑上移到链表首元位置，旧首元及其后继整体右移 ${NODE_SPACING}px。`;
    // 已有节点右移
    state.nodes = state.nodes.map((n) => {
      if (currentListIds.includes(n.id)) return { ...n, x: n.x + NODE_SPACING };
      return n;
    });
    // 新节点上移到主链表行
    state.nodes = state.nodes.map((n) =>
      n.id === sId ? { ...n, x: HEAD_X + NODE_SPACING, y: ROW_Y } : n,
    );
    currentListIds.unshift(sId);
    state.nodeCursors = { L: ['pHead'], [sId]: ['pTemp'] };
    state.highlights = [sId];
    state.activeNodes = [sId];
    yield clone(state);
  }

  // 结束帧
  state.codeLine = 18;
  state.stepId = stepCounter++;
  state.description = '输入结束 (x=999)，头插法建表完成，返回头指针 L。';
  state.variables = { ...state.variables, x: '999', pTemp: 'NULL' };
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}

// ============================================================
// 2. 尾插法建表（原子化拆解）
// ============================================================

export function* generateTailInsertStates(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;
  let pTailId = 'L';

  const state: AnimationState = {
    stepId: 0, codeLine: 1,
    description: '初始化：准备开始尾插法创建单链表。pTail 初始指向头结点 L。',
    variables: { L: '0x1000 (头结点)', pTail: 'L (指向头结点)', s: 'NULL', x: '?' },
    nodes: [{ id: 'L', val: 'Head', x: HEAD_X, y: ROW_Y, type: 'head' }],
    pointers: [{ id: 'p_L_null', from: 'L', to: 'NULL', type: 'solid', label: 'next' }],
    highlights: ['L'],
    nodeCursors: { L: ['pTail'] },
  };
  yield clone(state);

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const sId = `s_${i}`;
    const targetX = HEAD_X + NODE_SPACING + i * NODE_SPACING;
    const pTailNode = state.nodes.find((n) => n.id === pTailId);
    const tempX = (pTailNode?.x ?? HEAD_X) + TEMP_OFFSET_X;

    // 读取输入
    state.codeLine = 11;
    state.stepId = stepCounter++;
    state.description = `读取输入数据 x = ${val}。`;
    state.variables = { ...state.variables, x: String(val) };
    yield clone(state);

    // ──── 原子帧 1：生成暂存节点（下方孤立） ────
    state.codeLine = 13;
    state.stepId = stepCounter++;
    state.description = `执行 s = malloc：新节点在 pTail(${pTailId}) 下方暂存区出现，尚未改变尾结点的 next 指针。`;
    state.variables = { ...state.variables, s: `0x200${i}` };
    state.nodes = [
      ...state.nodes,
      { id: sId, val, x: tempX, y: STAGE_Y, type: 'normal' },
    ];
    state.nodeCursors = { [pTailId]: ['pTail'], [sId]: ['s'] };
    yield clone(state);

    state.codeLine = 14;
    state.stepId = stepCounter++;
    state.description = `执行 s->data = x：把 x=${val} 写入新结点 data 域。`;
    state.highlights = [sId];
    state.nodeCursors = { [pTailId]: ['pTail'], [sId]: ['s'] };
    yield clone(state);

    // ──── 原子帧 2：连接后继指针 ────
    state.codeLine = 15;
    state.stepId = stepCounter++;
    state.description = '新节点的 next 指向 p 指针指向结点的 next（尾插场景中 pTail->next 为 NULL）。s->next = NULL，节点仍停留在暂存区。';
    state.pointers = [
      ...state.pointers,
      { id: `p_${sId}_null`, from: sId, to: 'NULL', type: 'dashed', label: 'next' },
    ];
    state.nodeCursors = { [pTailId]: ['pTail'], [sId]: ['s'] };
    yield clone(state);

    // ──── 原子帧 3：断开并重连前驱指针 ────
    state.codeLine = 16;
    state.stepId = stepCounter++;
    state.description = `p 结点的 next，使其指向新结点（此处 p 为 pTail=${pTailId}）。删除 ${pTailId}->NULL 的旧指针，改为 ${pTailId}->next = s，形成清晰的向下斜指针。`;
    // 移除旧 pTail 的 NULL 指针
    state.pointers = state.pointers.filter(
      (p) => !(p.from === pTailId && p.to === 'NULL'),
    );
    state.pointers = [
      ...state.pointers,
      { id: `p_${pTailId}_to_${sId}`, from: pTailId, to: sId, type: 'solid', label: 'next', active: true },
    ];
    state.pointers = state.pointers.map((p) =>
      p.id === `p_${sId}_null` ? { ...p, type: 'solid' as const } : p,
    );
    state.nodeCursors = { [pTailId]: ['pTail'], [sId]: ['s'] };
    yield clone(state);

    // ──── 原子帧 4：空间位置重对齐 ────
    state.codeLine = 17;
    state.stepId = stepCounter++;
    state.description = `空间位置重对齐：s 从暂存区上移至主链表轴线 y=${ROW_Y}，并横向归位到尾部坐标，尾指针 pTail 后移到新节点 ${sId}。`;
    state.variables = { ...state.variables, pTail: sId };
    state.nodes = state.nodes.map((n) =>
      n.id === sId ? { ...n, x: targetX, y: ROW_Y } : n,
    );
    state.highlights = [sId];
    state.nodeCursors = { [sId]: ['pTail'] };
    pTailId = sId;
    yield clone(state);
  }

  // 结束帧
  state.codeLine = 20;
  state.stepId = stepCounter++;
  state.description = '输入结束 (x=999)，尾插法建表完成，返回头指针 L。';
  state.variables = { ...state.variables, x: '999', s: 'NULL' };
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}

// ============================================================
// 3. 按值查找（保留不变）
// ============================================================

export function* generateFindStates(
  values: number[],
  targetValue: number,
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  const state = buildListFrame(values, `初始化：准备在链表中按值查找 ${targetValue}。`);
  state.stepId = 0;
  state.codeLine = 1;
  state.variables = { p: 'L->next', target: String(targetValue), found: 'false' };
  yield clone(state);

  const nodeIds = state.nodes.filter((n) => n.type === 'normal').map((n) => n.id);

  for (let i = 0; i < nodeIds.length; i++) {
    const nId = nodeIds[i];
    const nodeVal = state.nodes.find((n) => n.id === nId)?.val;

    state.codeLine = i === 0 ? 3 : 7;
    state.stepId = stepCounter++;
    state.description = i === 0
      ? `指针 p 移动到第一个数据节点 ${nId} (p = L->next)。`
      : `指针 p 移动到下一个节点 ${nId} (p = p->next)。`;
    state.variables = { ...state.variables, p: nId };
    state.highlights = [nId];
    state.nodeCursors = { [nId]: ['p'] };
    yield clone(state);

    state.codeLine = 5;
    state.stepId = stepCounter++;
    const isMatch = nodeVal === targetValue;
    state.description = isMatch
      ? `比较: ${nodeVal} == ${targetValue} ✓  查找成功！`
      : `比较: ${nodeVal} ≠ ${targetValue}，继续查找。`;
    if (isMatch) {
      state.variables = { ...state.variables, found: 'true' };
      yield clone(state);
      state.codeLine = 6;
      state.stepId = stepCounter++;
      state.description = `查找成功！节点 ${nId} 的值为 ${targetValue}，返回该节点地址。`;
      state.highlights = [nId];
      state.nodeCursors = { [nId]: ['p'] };
      yield clone(state);
      return;
    }
    state.highlights = [];
    state.nodeCursors = {};
    yield clone(state);
  }

  state.codeLine = 9;
  state.stepId = stepCounter++;
  state.description = `遍历完成，未找到值 ${targetValue}，查找失败，返回 NULL。`;
  state.variables = { ...state.variables, p: 'NULL', found: 'false' };
  state.highlights = [];
  yield clone(state);
}

// ============================================================
// 4. 按位序插入（原子化拆解：暂存 → 连后继 → 断前驱重连 → 重对齐）
// ============================================================

export function* generateInsertStates(
  baseValues: number[],
  index: number,
  value: number,
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  if (index < 1 || index > baseValues.length + 1) {
    const errState: AnimationState = {
      stepId: 0, codeLine: 8,
      description: `错误：插入位序 i=${index} 不合法（链表长度=${baseValues.length}，有效范围 1~${baseValues.length + 1}）。`,
      variables: { i: String(index), e: String(value), error: 'true' },
      nodes: [{ id: 'L', val: 'Head', x: HEAD_X, y: ROW_Y, type: 'head' }],
      pointers: [{ id: 'p_L_null', from: 'L', to: 'NULL', type: 'solid', label: 'next' }],
      highlights: [],
    };
    yield clone(errState);
    return;
  }

  // ---- 阶段 0：展示初始链表 ----
  const startFrame = buildListFrame(
    baseValues,
    `准备在位序 i=${index} 处插入元素 ${value}。当前链表长度 = ${baseValues.length}。`,
  );
  startFrame.stepId = stepCounter++;
  startFrame.codeLine = 1;
  startFrame.variables = { i: String(index), e: String(value), p: '?', j: '?', pTemp: 'NULL' };
  startFrame.highlights = [];
  yield clone(startFrame);

  // ---- 阶段 1：寻找第 i-1 个节点 ----
  const state = clone(startFrame);
  const nodeIds = startFrame.nodes.filter((n) => n.type === 'normal').map((n) => n.id);

  // p = L, j = 0
  state.codeLine = 3;
  state.stepId = stepCounter++;
  state.description = '初始化：p = L（指向头结点），j = 0。';
  state.variables = { ...state.variables, p: 'L', j: '0' };
  state.highlights = ['L'];
  state.nodeCursors = { L: ['p'] };
  yield clone(state);

  const targetJ = index - 1;
  for (let j = 0; j < targetJ; j++) {
    const currentPId = j === 0 ? 'L' : nodeIds[j - 1];
    const nextNodeId = j < nodeIds.length ? nodeIds[j] : 'NULL';

    state.codeLine = 4;
    state.stepId = stepCounter++;
    state.description = `判断 p != NULL 且 j < i-1 (${j} < ${targetJ})，进入循环体。`;
    state.variables = { ...state.variables, p: currentPId, j: String(j) };
    state.highlights = [currentPId];
    state.nodeCursors = { [currentPId]: ['p'] };
    yield clone(state);

    state.codeLine = 5;
    state.stepId = stepCounter++;
    state.description = `p = p->next，移动到节点 ${nextNodeId}。`;
    state.variables = { ...state.variables, p: nextNodeId };
    state.highlights = nextNodeId === 'NULL' ? [] : [nextNodeId];
    state.nodeCursors = nextNodeId === 'NULL' ? {} : { [nextNodeId]: ['p'] };
    yield clone(state);

    state.codeLine = 6;
    state.stepId = stepCounter++;
    state.description = `j++ → j = ${j + 1}，判断 j < i-1 (${j + 1} < ${targetJ}) → ${j + 1 < targetJ ? '继续循环' : '退出循环'}。`;
    state.variables = { ...state.variables, j: String(j + 1) };
    yield clone(state);
  }

  const pIdx = targetJ === 0 ? -1 : targetJ - 1;
  const pId = pIdx < 0 ? 'L' : nodeIds[pIdx];

  // 找到插入点
  state.codeLine = 8;
  state.stepId = stepCounter++;
  state.description = `已找到第 i-1 个节点: ${pId}。p != NULL，位序合法，开始插入。`;
  state.variables = { ...state.variables, p: pId, j: String(targetJ) };
  state.highlights = [pId];
  state.nodeCursors = { [pId]: ['p'] };
  yield clone(state);

  // ================================================================
  // ---- 阶段 2：四步原子化空间插入 ----
  // ================================================================
  const pTempId = 'pTemp';
  const pNodeX = state.nodes.find((n) => n.id === pId)?.x ?? HEAD_X;
  const insertX = pNodeX + TEMP_OFFSET_X;

  // ═══ 原子帧 1：暂存区生成孤立节点 pTemp ═══
  state.codeLine = 10;
  state.stepId = stepCounter++;
  state.description = `生成暂存节点 pTemp：新节点在前驱 p(${pId}) 下方稍靠后的位置孤立出现，尚未改变任何 next 指针。`;
  state.variables = { ...state.variables, pTemp: '0x3000' };
  state.nodes = [
    ...state.nodes,
    { id: pTempId, val: value, x: insertX, y: STAGE_Y, type: 'normal' },
  ];
  state.nodeCursors = { [pId]: ['p'], [pTempId]: ['pTemp'] };
  yield clone(state);

  state.codeLine = 11;
  state.stepId = stepCounter++;
  state.description = `执行 pTemp->data = e：把 e=${value} 写入新结点 data 域。`;
  state.highlights = [pTempId];
  state.nodeCursors = { [pId]: ['p'], [pTempId]: ['pTemp'] };
  yield clone(state);

  // ═══ 原子帧 2：连接后继 — pTemp->next = p->next ═══
  state.codeLine = 12;
  state.stepId = stepCounter++;
  const pNextId = pIdx < 0 ? (nodeIds[0] ?? 'NULL') : (nodeIds[pIdx + 1] ?? 'NULL');
  state.description =
    pNextId === 'NULL'
      ? `新节点的 next 指向 p 指针指向结点的 next。pTemp->next = NULL，pTemp 仍停留在暂存区。`
      : `新节点的 next 指向 p 指针指向结点的 next。pTemp->next = ${pNextId}，pTemp 从暂存区斜向连接到后继节点，物理位置保持不变。`;
  state.pointers = [
    ...state.pointers,
    { id: 'p_pTemp_next', from: pTempId, to: pNextId, type: 'dashed', label: 'next', active: true },
  ];
  state.nodeCursors = { [pId]: ['p'], [pTempId]: ['pTemp'] };
  state.activePointers = ['p_pTemp_next'];
  yield clone(state);

  // ═══ 原子帧 3：断开并重连前驱 — p->next = pTemp ═══
  state.codeLine = 13;
  state.stepId = stepCounter++;
  state.description = `p 结点的 next，使其指向新结点。节点 ${pId} 的 next 断开与原后继 ${pNextId} 的连接，改为指向暂存区中的 pTemp，形成上下错位的对角线连接图。`;
  // 移除 p→旧后继
  state.pointers = state.pointers.filter(
    (ptr) => !(ptr.from === pId && ptr.to === pNextId),
  );
  // 添加 p→pTemp
  state.pointers = [
    ...state.pointers,
    { id: `p_${pId}_to_pTemp`, from: pId, to: pTempId, type: 'solid', label: 'next', active: true },
  ];
  // pTemp 的虚线变实线
  state.pointers = state.pointers.map((p) =>
    p.id === 'p_pTemp_next' ? { ...p, type: 'solid' as const } : p,
  );
  state.nodeCursors = { [pId]: ['p'], [pTempId]: ['pTemp'] };
  state.activePointers = [`p_${pId}_to_pTemp`];
  yield clone(state);

  // ═══ 原子帧 4：空间位置重对齐 (Kinematic Realignment) ═══
  state.codeLine = 13;
  state.stepId = stepCounter++;
  state.description = `空间位置重对齐：pTemp 及其后继节点完成最终排版，后继节点整体右移 ${NODE_SPACING}px，pTemp 从暂存区 y=${STAGE_Y} 拉回主链表轴线 y=${ROW_Y}。`;
  // 插入点右侧所有节点右移
  const shiftStartIdx = pIdx < 0 ? 0 : pIdx + 1;
  state.nodes = state.nodes.map((n) => {
    if (nodeIds.slice(shiftStartIdx).includes(n.id)) return { ...n, x: n.x + NODE_SPACING };
    return n;
  });
  // pTemp 上移
  const finalX =
    shiftStartIdx === 0
      ? HEAD_X + NODE_SPACING
      : HEAD_X + NODE_SPACING + shiftStartIdx * NODE_SPACING;
  state.nodes = state.nodes.map((n) =>
    n.id === pTempId ? { ...n, x: finalX, y: ROW_Y } : n,
  );
  state.highlights = [pTempId];
  state.nodeCursors = { [pTempId]: ['pTemp'] };
  yield clone(state);

  // 成功结束
  state.codeLine = 14;
  state.stepId = stepCounter++;
  state.description = `插入成功！位序 ${index} 处已插入新元素 ${value}。链表结构已稳定。`;
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}

// ============================================================
// 5. 按位序删除（原子化拆解：标记 → 下沉分离 → 断开重连 → 释放归位）
// ============================================================

export function* generateDeleteStates(
  baseValues: number[],
  index: number,
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  if (baseValues.length === 0 || index < 1 || index > baseValues.length) {
    const errState: AnimationState = {
      stepId: 0, codeLine: 9,
      description: `错误：删除位序 i=${index} 不合法（链表长度=${baseValues.length}，有效范围 1~${baseValues.length}）。`,
      variables: { i: String(index), error: 'true' },
      nodes: [{ id: 'L', val: 'Head', x: HEAD_X, y: ROW_Y, type: 'head' }],
      pointers: [{ id: 'p_L_null', from: 'L', to: 'NULL', type: 'solid', label: 'next' }],
      highlights: [],
    };
    yield clone(errState);
    return;
  }

  // ---- 阶段 0：展示初始链表 ----
  const startFrame = buildListFrame(
    baseValues,
    `准备删除位序 i=${index} 的节点。当前链表长度 = ${baseValues.length}。`,
  );
  startFrame.stepId = stepCounter++;
  startFrame.codeLine = 1;
  startFrame.variables = { i: String(index), p: '?', j: '?', q: 'NULL', e: '?' };
  startFrame.highlights = [];
  yield clone(startFrame);

  // ---- 阶段 1：寻找第 i-1 个节点 ----
  const state = clone(startFrame);
  const nodeIds = startFrame.nodes.filter((n) => n.type === 'normal').map((n) => n.id);

  state.codeLine = 3;
  state.stepId = stepCounter++;
  state.description = '初始化：p = L（指向头结点），j = 0。';
  state.variables = { ...state.variables, p: 'L', j: '0' };
  state.highlights = ['L'];
  state.nodeCursors = { L: ['p'] };
  yield clone(state);

  const targetJ = index - 1;
  for (let j = 0; j < targetJ; j++) {
    const currentPId = j === 0 ? 'L' : nodeIds[j - 1];
    const nextNodeId = j < nodeIds.length ? nodeIds[j] : 'NULL';

    state.codeLine = 4;
    state.stepId = stepCounter++;
    state.description = `判断 p != NULL 且 j < i-1 (${j} < ${targetJ})，进入循环体。`;
    state.variables = { ...state.variables, p: currentPId, j: String(j) };
    state.highlights = [currentPId];
    state.nodeCursors = { [currentPId]: ['p'] };
    yield clone(state);

    state.codeLine = 5;
    state.stepId = stepCounter++;
    state.description = `p = p->next，移动到节点 ${nextNodeId}。`;
    state.variables = { ...state.variables, p: nextNodeId };
    state.highlights = nextNodeId === 'NULL' ? [] : [nextNodeId];
    state.nodeCursors = nextNodeId === 'NULL' ? {} : { [nextNodeId]: ['p'] };
    yield clone(state);

    state.codeLine = 6;
    state.stepId = stepCounter++;
    state.description = `j++ → j = ${j + 1}，判断 j < i-1 (${j + 1} < ${targetJ}) → ${j + 1 < targetJ ? '继续循环' : '退出循环'}。`;
    state.variables = { ...state.variables, j: String(j + 1) };
    yield clone(state);
  }

  const pIdx = targetJ === 0 ? -1 : targetJ - 1;
  const pId = pIdx < 0 ? 'L' : nodeIds[pIdx];

  state.codeLine = 8;
  state.stepId = stepCounter++;
  state.description = `已找到第 i-1 个节点: ${pId}。p != NULL 且 p->next != NULL，位序合法。`;
  state.variables = { ...state.variables, p: pId, j: String(targetJ) };
  state.highlights = [pId];
  state.nodeCursors = { [pId]: ['p'] };
  yield clone(state);

  // ================================================================
  // ---- 阶段 2：四步原子化空间删除 ----
  // ================================================================
  const qIdx = pIdx + 1;
  if (qIdx >= nodeIds.length) {
    state.description = '错误：p->next 为 NULL，无节点可删除。';
    yield clone(state);
    return;
  }
  const qId = nodeIds[qIdx];
  const deletedValue = baseValues[index - 1];

  // ═══ 原子帧 1：标记 q 并下沉到暂存区 ═══
  state.codeLine = 11;
  state.stepId = stepCounter++;
  state.description = `执行 q = p->next：q 指向待删除节点 ${qId}，节点先下沉到暂存区，拓扑指针暂不修改。`;
  state.variables = { ...state.variables, q: qId };
  state.highlights = [qId];
  state.nodeCursors = { [pId]: ['p'], [qId]: ['q'] };
  // 下沉 q
  state.nodes = state.nodes.map((n) =>
    n.id === qId ? { ...n, y: STAGE_Y } : n,
  );
  yield clone(state);

  state.codeLine = 12;
  state.stepId = stepCounter++;
  state.description = `执行 e = q->data：取出待删除节点 ${qId} 的数据 ${deletedValue}。`;
  state.variables = { ...state.variables, e: String(deletedValue) };
  state.highlights = [qId];
  state.nodeCursors = { [pId]: ['p'], [qId]: ['q'] };
  yield clone(state);

  // ═══ 原子帧 2：断开并跨接前驱指针 ═══
  state.codeLine = 13;
  state.stepId = stepCounter++;
  const qNextId = qIdx + 1 < nodeIds.length ? nodeIds[qIdx + 1] : 'NULL';
  state.description =
    qNextId === 'NULL'
      ? `断开并重连前驱指针：p->next = q->next = NULL。删除 ${pId}->${qId} 与 ${qId}->NULL 的旧指针，待删除节点仍停留在暂存区。`
      : `断开并重连前驱指针：p->next = q->next = ${qNextId}。删除 ${pId}->${qId} 与 ${qId}->${qNextId} 的旧指针，主链表越过暂存区中的 q 直接跨接后继。`;
  state.pointers = state.pointers.filter(
    (ptr) =>
      !(ptr.from === pId && ptr.to === qId) &&
      !(ptr.from === qId && ptr.to === qNextId),
  );
  state.pointers = [
    ...state.pointers,
    { id: `p_${pId}_skip_${qId}`, from: pId, to: qNextId, type: 'solid', label: 'next', active: true },
  ];
  state.nodeCursors = { [pId]: ['p'], [qId]: ['q'] };
  state.activePointers = [`p_${pId}_skip_${qId}`];
  yield clone(state);

  // ═══ 原子帧 3：free(q) — 节点变灰但尚未挤压空间 ═══
  state.codeLine = 14;
  state.stepId = stepCounter++;
  state.description = `free(q)：释放暂存区中节点 ${qId} 的内存空间。该节点视觉上变灰，主链表物理布局暂不移动。`;
  state.nodes = state.nodes.map((n) =>
    n.id === qId ? { ...n, status: 'deleting' as const } : n,
  );
  state.highlights = [];
  state.nodeCursors = { [qId]: ['q'] };
  yield clone(state);

  // ═══ 原子帧 4：释放归位 — q 消失 + 后续节点左移 ═══
  state.codeLine = 15;
  state.stepId = stepCounter++;
  state.description = `空间位置重对齐：节点 ${qId} (值=${deletedValue}) 被彻底移除，后继节点整体左移 ${NODE_SPACING}px 填补空缺，链表恢复紧凑。`;
  state.nodes = state.nodes.filter((n) => n.id !== qId);
  state.pointers = state.pointers.filter((ptr) => ptr.from !== qId && ptr.to !== qId);
  // 后续节点左移
  state.nodes = state.nodes.map((n) => {
    if (nodeIds.slice(qIdx + 1).includes(n.id)) return { ...n, x: n.x - NODE_SPACING };
    return n;
  });
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}
