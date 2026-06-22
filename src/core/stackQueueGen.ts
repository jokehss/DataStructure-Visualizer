// ============================================================
// src/core/stackQueueGen.ts
// 顺序栈 & 环形队列 算法状态机
//
// 顺序栈：垂直列，x 固定，y 从下往上递减，top 游标指向栈顶
// 环形队列：SVG 扇形饼图，front/rear 双游标
//
// 约束：纯 function*，每次 yield 前深拷贝
// ============================================================

import type { AnimationState, Node } from '@/types';

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function setCursor(state: AnimationState, nodeId: string | null, label: string): void {
  const next = { ...(state.nodeCursors ?? {}) };

  Object.keys(next).forEach((key) => {
    next[key] = next[key].filter((item) => item !== label);
    if (next[key].length === 0) delete next[key];
  });

  if (nodeId) next[nodeId] = [...(next[nodeId] ?? []), label];
  state.nodeCursors = next;
}

function applyQueueCursors(state: AnimationState, front: number, rear: number): void {
  const next: Record<string, string[]> = {};
  if (front !== rear) next[`cq_${front}`] = ['front'];
  next[`cq_${rear}`] = [...(next[`cq_${rear}`] ?? []), 'rear'];
  state.nodeCursors = next;
}

function applySeqQueueCursors(state: AnimationState, front: number, rear: number): void {
  const next: Record<string, string[]> = {};
  if (front !== rear) next[`sq_${front}`] = ['front'];
  if (rear < SQ_MAX) next[`sq_${rear}`] = [...(next[`sq_${rear}`] ?? []), 'rear'];
  state.nodeCursors = next;
}

// ==================== 栈布局常量 ====================
const STK_X = 300;
const STK_BASE_Y = 420;
const STK_CELL_H = 52;    // 格子高度（含间距）
const STK_MAX = 6;        // 栈最大容量

// ==================== 环形队列布局常量 ====================
const CQ_CX = 400;
const CQ_CY = 280;
const CQ_MAX = 8;         // 队列最大容量（环上槽位数）

/** 环形队列第 i 个槽位的 startAngle / endAngle（弧度） */
function cqWedgeAngles(i: number): { startAngle: number; endAngle: number } {
  const wedgeSpan = (2 * Math.PI) / CQ_MAX; // π/4
  const startAngle = -Math.PI / 2 + i * wedgeSpan;
  const endAngle = startAngle + wedgeSpan;
  return { startAngle, endAngle };
}

/** 判断槽位 i 是否在 front→rear 的活跃区间内 */
function isSlotActive(i: number, front: number, rear: number, data: (number | null)[]): boolean {
  if (front === rear) return false; // 空队
  const inRange = front < rear
    ? (i >= front && i < rear)
    : (i >= front || i < rear);
  return inRange && data[i] !== null;
}

// ============================================================
// 1. 顺序栈 — 入栈 (Push)
// ============================================================

export function* generateStackPush(
  currentVals: number[],
  newValue: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;
  const top = currentVals.length;

  // 栈满检查
  if (top >= STK_MAX) {
    const err: AnimationState = {
      stepId: 0, codeLine: 9,
      description: `错误：栈已满 (top=${top} >= MaxSize=${STK_MAX})，无法入栈。栈溢出 (Stack Overflow)！`,
      variables: { 'S.top': String(top - 1), x: String(newValue), MaxSize: String(STK_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  // 初始帧：展示当前栈
  const state = buildStackFrame(currentVals, `准备将元素 ${newValue} 入栈。当前 top = ${top}。`);
  state.stepId = step++;
  state.codeLine = 8;
  state.variables = { 'S.top': String(top - 1), x: String(newValue), MaxSize: String(STK_MAX) };
  yield clone(state);

  state.codeLine = 9;
  state.stepId = step++;
  state.description = `判断 if(S.top == MaxSize - 1)：当前 S.top=${top - 1}，栈未满，可以入栈。`;
  state.variables = { ...state.variables, 'S.top': String(top - 1) };
  yield clone(state);

  // 入栈操作
  state.codeLine = 11;
  state.stepId = step++;
  state.description = `执行 ++S.top：S.top 从 ${top - 1} 上移到 ${top}。`;
  state.variables = { ...state.variables, 'S.top': String(top) };
  if (!state.nodes.some((n) => n.id === `stk_${top}`)) {
    state.nodes = [
      ...state.nodes,
      { id: `stk_${top}`, val: '∅', x: STK_X, y: STK_BASE_Y - top * STK_CELL_H, type: 'stack' as const },
    ];
  }
  setCursor(state, `stk_${top}`, 'S.top');
  yield clone(state);

  // 写入数据
  state.codeLine = 12;
  state.stepId = step++;
  const newTop = top; // 0-based index of new element
  state.description = `执行 S.data[S.top] = x：把 x=${newValue} 写入 data[${newTop}]。`;
  state.nodes = state.nodes.map((n) =>
    n.id === `stk_${newTop}` ? { ...n, val: newValue } : n,
  );
  // top 游标指向新栈顶
  setCursor(state, `stk_${newTop}`, 'S.top');
  state.highlights = [`stk_${newTop}`];
  yield clone(state);

  // 完成
  state.codeLine = 13;
  state.stepId = step++;
  state.description = `入栈成功！元素 ${newValue} 已压入栈顶，当前 S.top = ${top}。`;
  state.variables = { ...state.variables, 'S.top': String(top) };
  state.highlights = [];
  setCursor(state, `stk_${newTop}`, 'S.top');
  yield clone(state);
}

// ============================================================
// 2. 顺序栈 — 出栈 (Pop)
// ============================================================

export function* generateStackPop(
  currentVals: number[],
): Generator<AnimationState, void, undefined> {
  let step = 1;
  const top = currentVals.length;

  // 栈空检查
  if (top === 0) {
    const err: AnimationState = {
      stepId: 0, codeLine: 16,
      description: `错误：栈已空 (top=0)，无法出栈。栈下溢 (Stack Underflow)！`,
      variables: { 'S.top': '-1', MaxSize: String(STK_MAX), error: 'true' },
      nodes: [{ id: 'stk_-1', val: '⊥', x: STK_X, y: STK_BASE_Y + STK_CELL_H, type: 'stack' }],
      pointers: [],
      highlights: [],
      nodeCursors: { 'stk_-1': ['S.top'] },
    };
    yield clone(err);
    return;
  }

  const poppedVal = currentVals[top - 1];
  const state = buildStackFrame(currentVals, `准备弹出栈顶元素。当前 top = ${top}。`);
  state.stepId = step++;
  state.codeLine = 15;
  state.variables = { 'S.top': String(top - 1), e: '?', MaxSize: String(STK_MAX) };
  yield clone(state);

  state.codeLine = 16;
  state.stepId = step++;
  state.description = `判断 if(S.top == -1)：当前 S.top=${top - 1}，栈不为空。`;
  setCursor(state, `stk_${top - 1}`, 'S.top');
  yield clone(state);

  // 高亮栈顶
  const topId = `stk_${top - 1}`;
  state.codeLine = 18;
  state.stepId = step++;
  state.description = `执行 e = S.data[S.top]：读取栈顶 data[${top - 1}] = ${poppedVal}。`;
  state.highlights = [topId];
  setCursor(state, topId, 'S.top');
  state.variables = { ...state.variables, e: String(poppedVal) };
  yield clone(state);

  // 标记为删除
  state.codeLine = 18;
  state.stepId = step++;
  state.description = `e = data[${top - 1}] = ${poppedVal}，取出栈顶数据。`;
  state.nodes = state.nodes.map((n) =>
    n.id === topId ? { ...n, status: 'deleting' as const } : n,
  );
  setCursor(state, topId, 'S.top');
  yield clone(state);

  // top-- + 移除节点
  state.codeLine = 19;
  state.stepId = step++;
  state.description = `执行 S.top--：栈顶指针从 ${top - 1} 下移到 ${top - 2}，元素 ${poppedVal} 出栈。`;
  state.nodes = state.nodes.filter((n) => n.id !== topId);
  // 新栈顶游标
  const newTopId = top > 1 ? `stk_${top - 2}` : 'stk_-1';
  setCursor(state, newTopId, 'S.top');
  state.highlights = newTopId ? [newTopId] : [];
  state.variables = { ...state.variables, 'S.top': String(top - 2) };
  yield clone(state);

  // 完成
  state.codeLine = 20;
  state.stepId = step++;
  state.description = `出栈成功！返回元素 ${poppedVal}，当前 S.top = ${top - 2}。`;
  state.highlights = [];
  setCursor(state, newTopId, 'S.top');
  yield clone(state);
}

// ============================================================
// 3. 环形队列 — 入队 (Enqueue)
// ============================================================

export function* generateQueueEnqueue(
  data: (number | null)[],  // 长度为 CQ_MAX，null 表示空槽
  front: number,
  rear: number,
  newValue: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 队满检查：(rear + 1) % MaxSize == front
  const nextRear = (rear + 1) % CQ_MAX;
  if (nextRear === front) {
    const err: AnimationState = {
      stepId: 0, codeLine: 8,
      description: `错误：队列已满！(rear + 1) % MaxSize = (${rear} + 1) % ${CQ_MAX} = ${nextRear} == front(${front})，队满 (Queue Full)！`,
      variables: { front: String(front), rear: String(rear), x: String(newValue), MaxSize: String(CQ_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  // 初始帧
  const state = buildQueueFrame(data, front, rear, `准备将元素 ${newValue} 入队。front=${front}, rear=${rear}。`);
  state.stepId = step++;
  state.codeLine = 7;
  state.variables = { front: String(front), rear: String(rear), x: String(newValue), MaxSize: String(CQ_MAX) };
  yield clone(state);

  // 写入数据到 rear 位置
  state.codeLine = 10;
  state.stepId = step++;
  state.description = `执行 Q.data[Q.rear] = x：元素 ${newValue} 写入队尾槽位 rear=${rear}。`;
  const rAngles = cqWedgeAngles(rear);
  state.nodes = state.nodes.map((n) =>
    n.id === `cq_${rear}`
      ? { ...n, val: newValue, startAngle: rAngles.startAngle, endAngle: rAngles.endAngle, isActive: true }
      : n,
  );
  state.highlights = [`cq_${rear}`];
  applyQueueCursors(state, front, rear);
  yield clone(state);

  // rear = (rear + 1) % MaxSize — 回绕
  state.codeLine = 11;
  state.stepId = step++;
  const newRear = (rear + 1) % CQ_MAX;
  const hasWrapped = newRear < rear;
  state.description = hasWrapped
    ? `执行 Q.rear = (Q.rear + 1) % MaxSize：rear 从 ${rear} 通过取模回到数组开头 ${newRear}。`
    : `执行 Q.rear = (Q.rear + 1) % MaxSize：rear 从 ${rear} 后移到 ${newRear}。`;
  state.variables = { ...state.variables, rear: String(newRear) };
  applyQueueCursors(state, front, newRear);
  state.highlights = [];
  yield clone(state);

  // 完成
  state.codeLine = 12;
  state.stepId = step++;
  state.description = `入队成功！元素 ${newValue} 已加入队列。front=${front}, rear=${newRear}。`;
  state.variables = { ...state.variables, rear: String(newRear) };
  applyQueueCursors(state, front, newRear);
  yield clone(state);
}

// ============================================================
// 4. 环形队列 — 出队 (Dequeue)
// ============================================================

export function* generateQueueDequeue(
  data: (number | null)[],
  front: number,
  rear: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 队空检查：front == rear
  if (front === rear) {
    const err: AnimationState = {
      stepId: 0, codeLine: 15,
      description: `错误：队列已空 (front=${front} == rear=${rear})，无法出队。队空 (Queue Empty)！`,
      variables: { front: String(front), rear: String(rear), MaxSize: String(CQ_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const val = data[front];
  const state = buildQueueFrame(data, front, rear, `准备从队头出队。front=${front}, rear=${rear}。`);
  state.stepId = step++;
  state.codeLine = 14;
  state.variables = { front: String(front), rear: String(rear), e: String(val ?? '?'), MaxSize: String(CQ_MAX) };
  yield clone(state);

  // 读取队头
  const frontId = `cq_${front}`;
  state.codeLine = 17;
  state.stepId = step++;
  state.description = `执行 e = Q.data[Q.front]：读取队头槽位 ${front} 的元素 ${val}。`;
  state.highlights = [frontId];
  applyQueueCursors(state, front, rear);
  // 确保 front 节点 isActive 正确
  state.nodes = state.nodes.map((n) =>
    n.id === frontId ? { ...n, isActive: true } : n,
  );
  yield clone(state);

  // 标记删除
  state.codeLine = 17;
  state.stepId = step++;
  state.description = `元素 ${val} 已取出，槽位 data[${front}] 将被清空。`;
  state.nodes = state.nodes.map((n) =>
    n.id === frontId ? { ...n, status: 'deleting' as const } : n,
  );
  applyQueueCursors(state, front, rear);
  yield clone(state);

  // front = (front + 1) % MaxSize — 回绕
  state.codeLine = 18;
  state.stepId = step++;
  const newFront = (front + 1) % CQ_MAX;
  const hasWrapped = newFront < front;
  state.description = hasWrapped
    ? `执行 Q.front = (Q.front + 1) % MaxSize：front 从 ${front} 通过取模回到数组开头 ${newFront}。`
    : `执行 Q.front = (Q.front + 1) % MaxSize：front 从 ${front} 后移到 ${newFront}。`;

  state.nodes = state.nodes.map((n) =>
    n.id === frontId ? { ...n, val: '∅', status: undefined, isActive: false } : n,
  );
  state.variables = { ...state.variables, front: String(newFront) };
  state.highlights = [];

  applyQueueCursors(state, newFront, rear);
  yield clone(state);

  // 完成
  state.codeLine = 19;
  state.stepId = step++;
  state.description = `出队成功！返回元素 ${val}。front=${newFront}, rear=${rear}。`;
  state.variables = { ...state.variables, front: String(newFront) };
  applyQueueCursors(state, newFront, rear);
  yield clone(state);
}

// ======================== 辅助函数 ========================

/** 构建顺序栈的当前帧（导出供 App 层初始化使用） */
export function buildStackFrame(
  values: number[],
  description: string,
): AnimationState {
  const nodes: Node[] = [
    { id: 'stk_-1', val: '⊥', x: STK_X, y: STK_BASE_Y + STK_CELL_H, type: 'stack' as const },
    ...values.map((v, i) => ({
      id: `stk_${i}`,
      val: v,
      x: STK_X,
      y: STK_BASE_Y - i * STK_CELL_H,
      type: 'stack' as const,
    })),
  ];

  const top = values.length;
  const nodeCursors: Record<string, string[]> = {};
  nodeCursors[top > 0 ? `stk_${top - 1}` : 'stk_-1'] = ['S.top'];

  return {
    stepId: 0,
    codeLine: 8,
    description,
    variables: { 'S.top': String(top - 1), MaxSize: String(STK_MAX) },
    nodes,
    pointers: [],
    highlights: [],
    nodeCursors,
  };
}

/** 构建环形队列的当前帧 — 所有槽位渲染为 SVG 扇形（导出供 App 层初始化使用） */
export function buildQueueFrame(
  data: (number | null)[],
  front: number,
  rear: number,
  description: string,
): AnimationState {
  const nodes: Node[] = [];
  const nodeCursors: Record<string, string[]> = {};

  for (let i = 0; i < CQ_MAX; i++) {
    const angles = cqWedgeAngles(i);
    const d = data[i];
    const active = isSlotActive(i, front, rear, data);

    nodes.push({
      id: `cq_${i}`,
      val: d !== null ? d : '∅',
      x: CQ_CX,
      y: CQ_CY,
      type: 'pie_wedge' as const,
      startAngle: angles.startAngle,
      endAngle: angles.endAngle,
      isActive: active,
    });

    // 游标绑定
    const cursors: string[] = [];
    if (i === front && front !== rear) cursors.push('front');
    if (i === rear) cursors.push('rear');
    if (cursors.length > 0) nodeCursors[`cq_${i}`] = cursors;
  }

  return {
    stepId: 0, codeLine: 1, description,
    variables: { front: String(front), rear: String(rear), MaxSize: String(CQ_MAX), length: String((rear - front + CQ_MAX) % CQ_MAX) },
    nodes, pointers: [], highlights: [], nodeCursors,
  };
}

// ============================================================
// 5. 普通队列 — 入队 (Sequential Queue Enqueue)
// ============================================================

const SQ_MAX = 6;
const SQ_X = 50;
const SQ_Y = 250;
const SQ_SPACING = 70;

export function* generateSeqQueueEnqueue(
  data: (number | null)[],
  front: number,
  rear: number,
  newValue: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 假溢出检测
  if (rear >= SQ_MAX && front > 0) {
    const warn: AnimationState = {
      stepId: 0, codeLine: 9,
      description: `发生假溢出！队尾指针 rear=${rear} 已越界 (MaxSize=${SQ_MAX})，但队头前仍有 ${front} 个空闲单元 (front=${front}>0)。普通顺序队列无法利用这些空间，必须使用环形队列解决假溢出问题！`,
      variables: { front: String(front), rear: String(rear), x: String(newValue), MaxSize: String(SQ_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
      isWarning: true,
    };
    yield clone(warn);
    return;
  }

  if (rear >= SQ_MAX) {
    const err: AnimationState = {
      stepId: 0, codeLine: 9,
      description: `错误：队列已满！rear=${rear} >= MaxSize=${SQ_MAX}，且队头无空闲 (front=0)，真溢出！`,
      variables: { front: String(front), rear: String(rear), x: String(newValue), MaxSize: String(SQ_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const state = buildSeqQueueFrame(data, front, rear, `准备将元素 ${newValue} 入队。front=${front}, rear=${rear}。`);
  state.stepId = step++;
  state.codeLine = 8;
  state.variables = { front: String(front), rear: String(rear), x: String(newValue), MaxSize: String(SQ_MAX) };
  yield clone(state);

  // 写入
  state.codeLine = 11;
  state.stepId = step++;
  state.description = `执行 Q.data[Q.rear] = x：元素 ${newValue} 写入队尾位置 rear=${rear}。`;
  state.nodes = state.nodes.map((n) =>
    n.id === `sq_${rear}` ? { ...n, val: newValue, isActive: true } : n,
  );
  state.highlights = [`sq_${rear}`];
  applySeqQueueCursors(state, front, rear);
  yield clone(state);

  // rear++
  state.codeLine = 12;
  state.stepId = step++;
  const newRear = rear + 1;
  state.description = `执行 Q.rear++：队尾指针从 ${rear} 后移到 ${newRear}。`;
  state.variables = { ...state.variables, rear: String(newRear) };
  applySeqQueueCursors(state, front, newRear);
  state.highlights = [];
  yield clone(state);

  state.codeLine = 13;
  state.stepId = step++;
  state.description = `入队成功！元素 ${newValue} 已加入队列。front=${front}, rear=${newRear}。`;
  applySeqQueueCursors(state, front, newRear);
  yield clone(state);
}

// ============================================================
// 6. 普通队列 — 出队 (Sequential Queue Dequeue)
// ============================================================

export function* generateSeqQueueDequeue(
  data: (number | null)[],
  front: number,
  rear: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;

  if (front === rear) {
    const err: AnimationState = {
      stepId: 0, codeLine: 16,
      description: `错误：队列已空 (front=${front} == rear=${rear})，无法出队。队空 (Queue Empty)！`,
      variables: { front: String(front), rear: String(rear), MaxSize: String(SQ_MAX), error: 'true' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const val = data[front];
  const state = buildSeqQueueFrame(data, front, rear, `准备从队头出队。front=${front}, rear=${rear}。`);
  state.stepId = step++;
  state.codeLine = 15;
  state.variables = { front: String(front), rear: String(rear), e: String(val ?? '?'), MaxSize: String(SQ_MAX) };
  yield clone(state);

  const frontId = `sq_${front}`;
  state.codeLine = 18;
  state.stepId = step++;
  state.description = `执行 e = Q.data[Q.front]：读取队头 data[${front}] = ${val}。`;
  state.highlights = [frontId];
  applySeqQueueCursors(state, front, rear);
  yield clone(state);

  state.codeLine = 18;
  state.stepId = step++;
  state.description = `元素 ${val} 已取出，槽位 data[${front}] 被清空。`;
  state.nodes = state.nodes.map((n) => (n.id === frontId ? { ...n, status: 'deleting' as const } : n));
  applySeqQueueCursors(state, front, rear);
  yield clone(state);

  state.codeLine = 19;
  state.stepId = step++;
  const newFront = front + 1;
  state.description = `执行 Q.front++：队头指针从 ${front} 后移到 ${newFront}。`;
  state.nodes = state.nodes.map((n) =>
    n.id === frontId ? { ...n, val: '∅', status: undefined, isActive: false } : n,
  );
  state.variables = { ...state.variables, front: String(newFront) };
  state.highlights = [];
  applySeqQueueCursors(state, newFront, rear);
  yield clone(state);

  state.codeLine = 20;
  state.stepId = step++;
  state.description = `出队成功！返回元素 ${val}。front=${newFront}, rear=${rear}。`;
  applySeqQueueCursors(state, newFront, rear);
  yield clone(state);
}

// ============================================================
// 7. 普通队列 — 按值查找
// ============================================================

export function* generateSeqQueueFind(
  data: (number | null)[],
  front: number,
  rear: number,
  targetValue: number,
): Generator<AnimationState, void, undefined> {
  let step = 1;

  if (front === rear) {
    const err: AnimationState = {
      stepId: 0, codeLine: 1,
      description: '队列为空，无法查找。',
      variables: { front: String(front), rear: String(rear), target: String(targetValue), found: 'false' },
      nodes: [], pointers: [], highlights: [],
    };
    yield clone(err);
    return;
  }

  const state = buildSeqQueueFrame(data, front, rear, `在队列中查找值 ${targetValue}。front=${front}, rear=${rear}。`);
  state.stepId = step++;
  state.codeLine = 1;
  state.variables = { front: String(front), rear: String(rear), i: String(front), target: String(targetValue), found: 'false' };
  yield clone(state);

  for (let i = front; i < rear; i++) {
    const nId = `sq_${i}`;
    const nodeVal = data[i];

    state.codeLine = 23;
    state.stepId = step++;
    state.description = `i = ${i}，比较 data[${i}] = ${nodeVal} 与目标值 ${targetValue}。`;
    state.variables = { ...state.variables, i: String(i) };
    state.highlights = [nId];
    setCursor(state, nId, 'i');
    yield clone(state);

    state.codeLine = 24;
    state.stepId = step++;
    const isMatch = nodeVal === targetValue;
    state.description = isMatch
      ? `data[${i}] = ${nodeVal} == ${targetValue} ✓  查找成功！`
      : `data[${i}] = ${nodeVal} ≠ ${targetValue}，继续查找。`;

    if (isMatch) {
      state.variables = { ...state.variables, found: 'true' };
      yield clone(state);
      state.codeLine = 24;
      state.stepId = step++;
      state.description = `查找成功！位置 data[${i}] 的值为 ${targetValue}，返回索引 ${i}。`;
      yield clone(state);
      return;
    }
    setCursor(state, null, 'i');
    yield clone(state);
  }

  state.codeLine = 25;
  state.stepId = step++;
  state.description = `扫描完成 (front=${front} ~ rear-1=${rear - 1})，未找到值 ${targetValue}。`;
  state.variables = { ...state.variables, found: 'false' };
  state.highlights = [];
  setCursor(state, null, 'i');
  yield clone(state);
}

// ======================== 辅助：普通队列帧（导出供 App 层初始化） ========================

export function buildSeqQueueFrame(
  data: (number | null)[],
  front: number,
  rear: number,
  description: string,
): AnimationState {
  const nodes: Node[] = [];
  const nodeCursors: Record<string, string[]> = {};

  for (let i = 0; i < SQ_MAX; i++) {
    const d = data[i];
    nodes.push({
      id: `sq_${i}`,
      val: d !== null ? d : '∅',
      x: SQ_X + i * SQ_SPACING,
      y: SQ_Y,
      type: 'array' as const,
      isActive: d !== null && i >= front && i < rear,
    });
    const cursors: string[] = [];
    if (i === front && front !== rear) cursors.push('front');
    if (i === rear) cursors.push('rear');
    if (cursors.length > 0) nodeCursors[`sq_${i}`] = cursors;
  }

  return {
    stepId: 0, codeLine: 1, description,
    variables: { front: String(front), rear: String(rear), MaxSize: String(SQ_MAX), length: String(rear - front) },
    nodes, pointers: [], highlights: [], nodeCursors,
  };
}

// ============================================================
// 8. 顺序栈批量初始化 Generator
// ============================================================

export function* generateStackInit(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 空栈初始帧
  const state: AnimationState = {
    stepId: 0, codeLine: 1,
    description: '初始化空栈。S.top = -1，栈底指针位于 data[-1]。',
    variables: { 'S.top': '-1', MaxSize: String(STK_MAX) },
    nodes: [{ id: 'stk_-1', val: '⊥', x: STK_X, y: STK_BASE_Y + STK_CELL_H, type: 'stack' }],
    pointers: [],
    highlights: [],
    nodeCursors: { 'stk_-1': ['S.top'] },
  };
  yield clone(state);

  for (let i = 0; i < values.length && i < STK_MAX; i++) {
    const val = values[i];

    // top++
    state.codeLine = 11;
    state.stepId = step++;
    state.description = `执行 ++S.top：S.top 上移到 ${i}，准备写入 data[${i}]。`;
    state.variables = { ...state.variables, 'S.top': String(i) };
    yield clone(state);

    // 写入数据
    state.codeLine = 12;
    state.stepId = step++;
    state.description = `执行 S.data[S.top] = ${val}。元素 ${val} 入栈，位于栈的第 ${i} 层。`;
    state.nodes = [
      ...state.nodes,
      {
        id: `stk_${i}`, val,
        x: STK_X, y: STK_BASE_Y - i * STK_CELL_H,
        type: 'stack' as const,
      },
    ];
    state.highlights = [`stk_${i}`];
    state.nodeCursors = { [`stk_${i}`]: ['S.top'] };
    yield clone(state);
  }

  // 完成帧
  state.codeLine = 13;
  state.stepId = step++;
  const top = values.length;
  state.description = `顺序栈初始化完成。预填充了 [${values.join(', ')}]，S.top = ${top - 1}，栈顶元素为 ${values[top - 1] ?? '无'}。`;
  state.variables = { ...state.variables, 'S.top': String(top - 1) };
  state.highlights = [];
  yield clone(state);
}

// ============================================================
// 9. 普通队列批量初始化 Generator
// ============================================================

export function* generateNormalQueueInit(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 空队初始帧
  const state = buildSeqQueueFrame(
    Array(SQ_MAX).fill(null) as (number | null)[],
    0,
    0,
    '初始化空队列。front = 0, rear = 0。队列为空，等待元素入队。',
  );
  state.stepId = 0;
  state.codeLine = 1;
  yield clone(state);

  for (let i = 0; i < values.length && i < SQ_MAX; i++) {
    const val = values[i];

    // 写入 data[rear]
    state.codeLine = 11;
    state.stepId = step++;
    state.description = `执行 Q.data[Q.rear] = ${val}。元素入队，写入队尾位置，当前队列长度 ${i + 1}。`;
    state.nodes = state.nodes.map((n) =>
      n.id === `sq_${i}` ? { ...n, val, isActive: true } : n,
    );
    state.highlights = [`sq_${i}`];

    // front/rear 始终保持可见并随数据增长移动
    applySeqQueueCursors(state, 0, i);
    yield clone(state);

    // rear++
    state.codeLine = 12;
    state.stepId = step++;
    const newRear = i + 1;
    state.description = `执行 Q.rear++：rear 后移至下一可用槽位 ${newRear}。`;
    state.variables = { ...state.variables, rear: String(newRear) };
    applySeqQueueCursors(state, 0, newRear);
    state.highlights = [];
    yield clone(state);
  }

  // 完成帧
  state.codeLine = 13;
  state.stepId = step++;
  const len = Math.min(values.length, SQ_MAX);
  state.description = `普通队列初始化完成。front=0, rear=${len}，队列中有 ${len} 个元素：[${values.slice(0, len).join(', ')}]。`;
  state.variables = { ...state.variables, front: '0', rear: String(len), length: String(len) };
  applySeqQueueCursors(state, 0, len);
  yield clone(state);
}

// ============================================================
// 10. 环形队列批量初始化 Generator
// ============================================================

export function* generateCircularQueueInit(
  values: number[],
): Generator<AnimationState, void, undefined> {
  let step = 1;

  // 空队初始帧
  const state = buildQueueFrame(
    Array(CQ_MAX).fill(null) as (number | null)[],
    0,
    0,
    `初始化空环形队列。MaxSize=${CQ_MAX}，front=0, rear=0。环形布局已就绪，等待元素入队。`,
  );
  state.stepId = 0;
  state.codeLine = 1;
  yield clone(state);

  for (let i = 0; i < values.length && i < CQ_MAX; i++) {
    const val = values[i];
    const rear = i; // 当前 rear 位置

    // 写入 data[rear]
    state.codeLine = 10;
    state.stepId = step++;
    state.description = `执行 Q.data[Q.rear] = ${val}。元素入队到环形槽位 ${rear}，当前队列长度 ${i + 1}。`;
    const angles = cqWedgeAngles(rear);
    state.nodes = state.nodes.map((n) =>
      n.id === `cq_${rear}`
        ? { ...n, val, startAngle: angles.startAngle, endAngle: angles.endAngle, isActive: true }
        : n,
    );
    state.highlights = [`cq_${rear}`];
    applyQueueCursors(state, 0, rear);
    yield clone(state);

    // rear = (rear + 1) % MaxSize
    state.codeLine = 11;
    state.stepId = step++;
    const newRear = (rear + 1) % CQ_MAX;
    state.description = `rear = (${rear} + 1) % ${CQ_MAX} = ${newRear}。队尾指针沿环形移动到槽位 ${newRear}。`;
    state.variables = { ...state.variables, rear: String(newRear) };
    applyQueueCursors(state, 0, newRear);
    state.highlights = [];
    yield clone(state);
  }

  // 完成帧 — 重新渲染所有槽位（含空槽）
  state.codeLine = 12;
  state.stepId = step++;
  const len = Math.min(values.length, CQ_MAX);
  const finalData: (number | null)[] = Array(CQ_MAX).fill(null);
  for (let i = 0; i < len; i++) finalData[i] = values[i];
  const finalFrame = buildQueueFrame(finalData, 0, len, `环形队列初始化完成。front=0, rear=${len}，环形布局中有 ${len} 个元素：[${values.slice(0, len).join(', ')}]。`);
  finalFrame.stepId = state.stepId;
  finalFrame.codeLine = 12;
  yield clone(finalFrame);
}
