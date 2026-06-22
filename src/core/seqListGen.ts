// ============================================================
// src/core/seqListGen.ts
// 顺序表（数组）核心算法 —— 纯 Generator 函数（4 个操作）
//
// 视觉映射规范：
//   - 顺序表在内存中连续存储，不使用 SVG 连线 (pointers: [])
//   - 每个元素渲染为 type:'array' 的连续格子
//   - x = ARR_X + i * CELL_SPACING，紧密排列
//   - 插入：从后往前逐格右移，腾出空位后填入新值
//   - 删除：目标变灰 → 后续逐个左移填补空缺
//   - 查找：游标 i 从左到右遍历对比
//
// 约束：纯 function*，每次 yield 前深拷贝
// ============================================================

import type { AnimationState, Node } from '@/types';

// ---- 布局常量 ----
const ARR_X = 50;
const ARR_Y = 250;
const CELL_SPACING = 70; // 单元格间距（含间距）

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/** 计算数组位置 k 对应的 x 坐标 */
function posX(k: number): number {
  return ARR_X + k * CELL_SPACING;
}

/** 根据 x 坐标反算数组位置（用于标签定位） */
// (unused directly, label computed in canvas from x)

// ============================================================
// 0. 辅助：构建顺序表初始帧
// ============================================================

function buildSeqFrame(
  values: number[],
  description: string,
): AnimationState {
  const nodes: Node[] = values.map((v, i) => ({
    id: `arr_${i}`,
    val: v,
    x: posX(i),
    y: ARR_Y,
    type: 'array' as const,
  }));

  return {
    stepId: 0,
    codeLine: 9,
    description,
    variables: { length: String(values.length) },
    nodes,
    pointers: [],
    highlights: [],
  };
}

// ============================================================
// 1. 顺序表初始化
// ============================================================

export function* generateSeqInit(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  // 空表初始帧
  const state: AnimationState = {
    stepId: 0,
    codeLine: 1,
    description: '初始化：创建一个空的顺序表 (length = 0)。',
    variables: { length: '0' },
    nodes: [],
    pointers: [],
    highlights: [],
  };
  yield clone(state);

  // 逐个元素插入到末尾（模拟尾插）
  for (let i = 0; i < values.length; i++) {
    const val = values[i];

    state.codeLine = 14;
    state.stepId = stepCounter++;
    state.description = `插入元素 ${val} 到位置 data[${i}]。`;
    state.variables = { length: String(i) };
    state.nodes = [
      ...state.nodes,
      {
        id: `arr_${i}`,
        val,
        x: posX(i),
        y: ARR_Y,
        type: 'array' as const,
      },
    ];
    yield clone(state);

    // length++
    state.codeLine = 15;
    state.stepId = stepCounter++;
    state.description = `length++ → length = ${i + 1}。`;
    state.variables = { length: String(i + 1) };
    yield clone(state);
  }

  // 完成
  state.codeLine = 17;
  state.stepId = stepCounter++;
  state.description = `顺序表初始化完成，length = ${values.length}。`;
  state.variables = { length: String(values.length) };
  yield clone(state);
}

// ============================================================
// 2. 顺序表按位序插入（核心：从后往前逐格右移）
// ============================================================

export function* generateSeqInsert(
  baseValues: number[],
  index: number,  // 1-based
  value: number,
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  // 入参校验
  if (index < 1 || index > baseValues.length + 1) {
    const err: AnimationState = {
      stepId: 0, codeLine: 3,
      description: `错误：插入位序 i=${index} 不合法（表长=${baseValues.length}，有效范围 1~${baseValues.length + 1}）。`,
      variables: { i: String(index), e: String(value), length: String(baseValues.length), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const LEN = baseValues.length;
  const state = buildSeqFrame(
    baseValues,
    `准备在位序 i=${index} 处插入元素 ${value}。当前 length = ${LEN}。`,
  );
  state.stepId = stepCounter++;
  state.codeLine = 2;
  state.variables = { length: String(LEN), i: String(index), e: String(value), j: '?' };
  yield clone(state);

  // ---- 阶段 1：从后往前逐格右移 ----
  // C 代码: for(j = L.length; j >= i; j--) L.data[j] = L.data[j-1];

  // j 初始化为 length
  state.codeLine = 5;
  state.stepId = stepCounter++;
  state.description = `j = length = ${LEN}，开始从后往前遍历。`;
  state.variables = { ...state.variables, j: String(LEN) };
  yield clone(state);

  for (let j = LEN; j >= index; j--) {
    // 循环判断
    state.codeLine = 5;
    state.stepId = stepCounter++;
    const enterLoop = j >= index;
    state.description = enterLoop
      ? `判断 j(${j}) >= i(${index}) → true，进入循环体。`
      : `判断 j(${j}) >= i(${index}) → false，退出循环。`;
    if (!enterLoop) break;
    yield clone(state);

    // L.data[j] = L.data[j-1]（元素右移一格）
    state.codeLine = 6;
    state.stepId = stepCounter++;
    const srcIdx = j - 1;
    const srcNode = state.nodes.find(
      (n) => Math.abs(n.x - posX(srcIdx)) < 5,
    );
    const srcVal = srcNode?.val ?? '?';
    state.description = `L.data[${j}] = L.data[${srcIdx}] = ${srcVal}（元素右移一格）。`;

    // 查找源节点并移动
    state.nodes = state.nodes.map((n) => {
      if (Math.abs(n.x - posX(srcIdx)) < 5) {
        return { ...n, x: posX(j) };
      }
      return n;
    });
    state.highlights = state.nodes
      .filter((n) => Math.abs(n.x - posX(j)) < 5)
      .map((n) => n.id);

    // 游标 j 指向当前位置
    state.nodeCursors = state.nodes
      .filter((n) => Math.abs(n.x - posX(j)) < 5)
      .reduce<Record<string, string[]>>((acc, n) => {
        acc[n.id] = ['j'];
        return acc;
      }, {});
    yield clone(state);

    // j--
    if (j > index) {
      state.codeLine = 5;
      state.stepId = stepCounter++;
      state.description = `j-- → j = ${j - 1}，继续循环。`;
      state.variables = { ...state.variables, j: String(j - 1) };
      state.nodeCursors = {};
      yield clone(state);
    }
  }

  // 循环结束
  state.codeLine = 5;
  state.stepId = stepCounter++;
  state.description = `循环结束。j = ${index - 1} < i(${index})，腾出了位置 data[${index - 1}]。`;
  state.variables = { ...state.variables, j: String(index - 1) };
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);

  // ---- 阶段 2：在新空位填入值 ----
  state.codeLine = 7;
  state.stepId = stepCounter++;
  state.description = `L.data[${index - 1}] = e = ${value}（在空位填入新元素）。`;
  // 创建新节点或更新现有节点
  const newNodeId = `arr_ins`;
  // 移除可能已存在的插入节点，创建新节点
  state.nodes = state.nodes.filter((n) => n.id !== newNodeId);
  state.nodes = [
    ...state.nodes,
    {
      id: newNodeId,
      val: value,
      x: posX(index - 1),
      y: ARR_Y,
      type: 'array' as const,
    },
  ];
  state.highlights = [newNodeId];
  state.nodeCursors = {};
  yield clone(state);

  // ---- 阶段 3：length++ ----
  state.codeLine = 8;
  state.stepId = stepCounter++;
  const newLen = LEN + 1;
  state.description = `L.length++ → length = ${newLen}。`;
  state.variables = { ...state.variables, length: String(newLen), j: '-' };
  state.highlights = [];
  // 排序 nodes 按 x 坐标，并重新赋 ID
  state.nodes = state.nodes
    .sort((a, b) => a.x - b.x)
    .map((n, i) => ({ ...n, id: `arr_${i}` }));
  yield clone(state);
}

// ============================================================
// 3. 顺序表按位序删除（核心：目标变灰 → 后续逐个左移）
// ============================================================

export function* generateSeqDelete(
  baseValues: number[],
  index: number,  // 1-based
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  // 入参校验
  if (baseValues.length === 0 || index < 1 || index > baseValues.length) {
    const err: AnimationState = {
      stepId: 0, codeLine: 3,
      description: `错误：删除位序 i=${index} 不合法（表长=${baseValues.length}，有效范围 1~${baseValues.length}）。`,
      variables: { i: String(index), length: String(baseValues.length), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const LEN = baseValues.length;
  const state = buildSeqFrame(
    baseValues,
    `准备删除位序 i=${index} 的元素 data[${index - 1}]。当前 length = ${LEN}。`,
  );
  state.stepId = stepCounter++;
  state.codeLine = 2;
  state.variables = {
    length: String(LEN),
    i: String(index),
    j: '?',
    e: '?',
  };
  yield clone(state);

  // ---- 阶段 1：e = L.data[i-1]（取出被删元素） ----
  const targetIdx = index - 1;
  const targetNode = state.nodes.find(
    (n) => Math.abs(n.x - posX(targetIdx)) < 5,
  );
  const deletedVal = targetNode?.val ?? baseValues[targetIdx];

  state.codeLine = 5;
  state.stepId = stepCounter++;
  state.description = `e = L.data[${targetIdx}] = ${deletedVal}，取出被删元素的数据。`;
  state.variables = { ...state.variables, e: String(deletedVal) };
  state.highlights = targetNode ? [targetNode.id] : [];
  yield clone(state);

  // ---- 阶段 2：目标元素变灰 ----
  state.codeLine = 5;
  state.stepId = stepCounter++;
  state.description = `标记 data[${targetIdx}] 即将被删除。`;
  state.nodes = state.nodes.map((n) =>
    Math.abs(n.x - posX(targetIdx)) < 5
      ? { ...n, status: 'deleting' as const }
      : n,
  );
  yield clone(state);

  // ---- 阶段 3：从前往后逐个左移填补 ----
  // C 代码: for(j = i; j < L.length; j++) L.data[j-1] = L.data[j];

  state.codeLine = 6;
  state.stepId = stepCounter++;
  state.description = `j = i = ${index}，开始从前往后遍历，逐个左移填补空缺。`;
  state.variables = { ...state.variables, j: String(index) };
  yield clone(state);

  for (let j = index; j < LEN; j++) {
    // 循环判断
    state.codeLine = 6;
    state.stepId = stepCounter++;
    const enterLoop = j < LEN;
    state.description = enterLoop
      ? `判断 j(${j}) < length(${LEN}) → true，进入循环体。`
      : `判断 j(${j}) < length(${LEN}) → false，退出循环。`;
    if (!enterLoop) break;
    yield clone(state);

    // L.data[j-1] = L.data[j]（元素左移一格）
    state.codeLine = 7;
    state.stepId = stepCounter++;
    const srcIdx = j;
    const srcNode = state.nodes.find(
      (n) => Math.abs(n.x - posX(srcIdx)) < 5 && n.status !== 'deleting',
    );
    const srcVal = srcNode?.val ?? '?';
    state.description = `L.data[${j - 1}] = L.data[${j}] = ${srcVal}（元素左移一格）。`;

    state.nodes = state.nodes.map((n) => {
      if (
        Math.abs(n.x - posX(srcIdx)) < 5 &&
        n.status !== 'deleting'
      ) {
        return { ...n, x: posX(j - 1) };
      }
      return n;
    });
    state.highlights = state.nodes
      .filter((n) => Math.abs(n.x - posX(j - 1)) < 5)
      .map((n) => n.id);
    state.nodeCursors = state.nodes
      .filter((n) => Math.abs(n.x - posX(j - 1)) < 5 && n.status !== 'deleting')
      .reduce<Record<string, string[]>>((acc, n) => {
        acc[n.id] = ['j'];
        return acc;
      }, {});
    yield clone(state);

    // j++
    if (j + 1 < LEN) {
      state.codeLine = 6;
      state.stepId = stepCounter++;
      state.description = `j++ → j = ${j + 1}，继续循环。`;
      state.variables = { ...state.variables, j: String(j + 1) };
      yield clone(state);
    }
  }

  // 循环结束
  state.codeLine = 6;
  state.stepId = stepCounter++;
  state.description = `循环结束。所有后续元素已左移填补空缺。`;
  state.nodeCursors = {};
  state.highlights = [];
  yield clone(state);

  // ---- 阶段 4：移除末尾多余节点 + length-- ----
  state.codeLine = 8;
  state.stepId = stepCounter++;
  const newLen = LEN - 1;
  state.description = `L.length-- → length = ${newLen}。删除完成。`;
  // 移除 deleting 节点和末尾多余节点，重新排序
  state.nodes = state.nodes.filter((n) => n.status !== 'deleting');
  state.nodes = state.nodes
    .sort((a, b) => a.x - b.x)
    .filter((_, i) => i < newLen)  // 只保留前 newLen 个
    .map((n, i) => ({ ...n, id: `arr_${i}`, x: posX(i) }));
  state.variables = { ...state.variables, length: String(newLen), j: '-' };
  yield clone(state);
}

// ============================================================
// 4. 顺序表按值查找
// ============================================================

export function* generateSeqFind(
  baseValues: number[],
  targetValue: number,
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;

  if (baseValues.length === 0) {
    const err: AnimationState = {
      stepId: 0, codeLine: 1,
      description: '顺序表为空，无法查找。',
      variables: { target: String(targetValue), length: '0', found: 'false' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const state = buildSeqFrame(
    baseValues,
    `准备在顺序表中查找值 ${targetValue}。length = ${baseValues.length}。`,
  );
  state.stepId = stepCounter++;
  state.codeLine = 1;
  state.variables = {
    length: String(baseValues.length),
    i: '0',
    target: String(targetValue),
    found: 'false',
  };
  yield clone(state);

  // 逐元素遍历
  for (let i = 0; i < baseValues.length; i++) {
    const nId = `arr_${i}`;

    // 游标 i 移动到当前位置
    state.codeLine = 3;
    state.stepId = stepCounter++;
    state.description = `i = ${i}，比较 L.data[${i}] 与目标值 ${targetValue}。`;
    state.variables = { ...state.variables, i: String(i) };
    state.highlights = [nId];
    state.nodeCursors = { [nId]: ['i'] };
    yield clone(state);

    // 比较
    state.codeLine = 4;
    state.stepId = stepCounter++;
    const isMatch = baseValues[i] === targetValue;
    state.description = isMatch
      ? `L.data[${i}] = ${baseValues[i]} == ${targetValue} ✓  查找成功！`
      : `L.data[${i}] = ${baseValues[i]} ≠ ${targetValue}，继续查找。`;
    state.highlights = [nId];

    if (isMatch) {
      state.variables = { ...state.variables, found: 'true' };
      state.nodeCursors = { [nId]: ['i'] };
      yield clone(state);

      // 返回
      state.codeLine = 5;
      state.stepId = stepCounter++;
      state.description = `查找成功！位置 data[${i}] 的值为 ${targetValue}，返回索引 ${i}。`;
      yield clone(state);
      return;
    }

    state.nodeCursors = {};
    yield clone(state);
  }

  // 未找到
  state.codeLine = 7;
  state.stepId = stepCounter++;
  state.description = `遍历完成，未找到值 ${targetValue}，查找失败，返回 -1。`;
  state.variables = { ...state.variables, i: String(baseValues.length), found: 'false' };
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}
