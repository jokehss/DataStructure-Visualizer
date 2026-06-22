// ============================================================
// src/core/binaryTreeGen.ts
// 二叉树链式结构：递归建树 + 三种递归遍历 + 性质演示
// ============================================================

import type { AnimationState, Node, Pointer } from '@/types';

type TreeToken = number | null;
type TraversalOrder = 'preorder' | 'inorder' | 'postorder';

interface BinaryTreeNode {
  id: string;
  value: number;
  x: number;
  y: number;
  left: BinaryTreeNode | null;
  right: BinaryTreeNode | null;
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const ROOT_X = 420;
const ROOT_Y = 80;
const LEVEL_GAP = 112;
const ROOT_OFFSET = 190;

function getHorizontalOffset(depth: number): number {
  return Math.max(68, ROOT_OFFSET / Math.pow(1.8, depth));
}

function nodeIdFromPath(path: string): string {
  return path === '' ? 'bt_root' : `bt_${path}`;
}

function cursorState(nodeId: string | null, label = 'T'): Record<string, string[]> {
  return nodeId ? { [nodeId]: [label] } : {};
}

function tokenText(token: TreeToken | undefined): string {
  if (token === undefined) return '输入结束';
  return token === null ? '#' : String(token);
}

function makePointer(parentId: string, childId: string, side: 'left' | 'right'): Pointer {
  return {
    id: `p_${parentId}_${side}_${childId}`,
    from: parentId,
    to: childId,
    type: 'solid',
    label: side === 'left' ? 'lchild' : 'rchild',
  };
}

function buildBinaryTree(tokens: TreeToken[]): BinaryTreeNode | null {
  let tokenIndex = 0;

  function build(depth: number, x: number, path: string): BinaryTreeNode | null {
    if (tokenIndex >= tokens.length) return null;
    const currentToken = tokens[tokenIndex++];
    if (currentToken === null) return null;

    const node: BinaryTreeNode = {
      id: nodeIdFromPath(path),
      value: currentToken,
      x,
      y: ROOT_Y + depth * LEVEL_GAP,
      left: null,
      right: null,
    };
    const offset = getHorizontalOffset(depth);
    node.left = build(depth + 1, x - offset, `${path}L`);
    node.right = build(depth + 1, x + offset, `${path}R`);
    return node;
  }

  return build(0, ROOT_X, '');
}

function flattenTree(root: BinaryTreeNode | null): { nodes: Node[]; pointers: Pointer[] } {
  const nodes: Node[] = [];
  const pointers: Pointer[] = [];

  function walk(node: BinaryTreeNode | null): void {
    if (!node) return;
    nodes.push({ id: node.id, val: node.value, x: node.x, y: node.y, type: 'tree' });
    if (node.left) pointers.push(makePointer(node.id, node.left.id, 'left'));
    if (node.right) pointers.push(makePointer(node.id, node.right.id, 'right'));
    walk(node.left);
    walk(node.right);
  }

  walk(root);
  return { nodes, pointers };
}

function countNodes(root: BinaryTreeNode | null): number {
  if (!root) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
}

function treeHeight(root: BinaryTreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(treeHeight(root.left), treeHeight(root.right));
}

function collectByDegree(root: BinaryTreeNode | null, degree: number): string[] {
  const result: string[] = [];

  function walk(node: BinaryTreeNode | null): void {
    if (!node) return;
    const currentDegree = Number(Boolean(node.left)) + Number(Boolean(node.right));
    if (currentDegree === degree) result.push(node.id);
    walk(node.left);
    walk(node.right);
  }

  walk(root);
  return result;
}

function traversalTitle(order: TraversalOrder): string {
  if (order === 'preorder') return '先序遍历';
  if (order === 'inorder') return '中序遍历';
  return '后序遍历';
}

export function* generateBinaryTreeBuildStates(
  tokens: TreeToken[],
): Generator<AnimationState, void, undefined> {
  let stepCounter = 1;
  let tokenIndex = 0;

  const state: AnimationState = {
    stepId: 0,
    codeLine: 1,
    description: '初始化：按前序序列递归创建二叉树，# 表示空子树。每个结点包含 data、lchild、rchild 三个域。',
    variables: { T: 'NULL', token: '?', index: '0', depth: '0' },
    nodes: [],
    pointers: [],
    highlights: [],
    nodeCursors: {},
  };
  yield clone(state);

  function* createSubtree(
    depth: number,
    x: number,
    path: string,
    parentId: string | null,
    side: 'left' | 'right' | null,
  ): Generator<AnimationState, string | null, undefined> {
    const currentToken = tokens[tokenIndex];
    const currentIndex = tokenIndex;
    tokenIndex += 1;

    state.codeLine = 5;
    state.stepId = stepCounter++;
    state.description = `读取前序序列第 ${currentIndex + 1} 项：${tokenText(currentToken)}。`;
    state.variables = { T: '待判定', token: tokenText(currentToken), index: String(currentIndex), depth: String(depth) };
    state.highlights = [];
    state.nodeCursors = parentId ? cursorState(parentId, 'parent') : {};
    yield clone(state);

    if (currentToken === null || currentToken === undefined) {
      state.codeLine = 7;
      state.stepId = stepCounter++;
      state.description = currentToken === undefined
        ? `递归到 ${side ?? 'root'} 子树时输入已耗尽，按空子树处理并返回 NULL。`
        : `读到 #：${side ?? 'root'} 子树为空，T = NULL，递归返回上一层。`;
      state.variables = { ...state.variables, T: 'NULL' };
      state.highlights = [];
      state.nodeCursors = parentId ? cursorState(parentId, 'parent') : {};
      yield clone(state);
      return null;
    }

    const currentId = nodeIdFromPath(path);
    state.codeLine = 9;
    state.stepId = stepCounter++;
    state.description = `申请链式结点 ${currentId}，写入 data = ${currentToken}，左右孩子指针暂为空。`;
    state.variables = { ...state.variables, T: currentId };
    state.nodes = [
      ...state.nodes,
      { id: currentId, val: currentToken, x, y: ROOT_Y + depth * LEVEL_GAP, type: 'tree' },
    ];
    if (parentId && side) state.pointers = [...state.pointers, makePointer(parentId, currentId, side)];
    state.highlights = [currentId];
    state.nodeCursors = cursorState(currentId);
    yield clone(state);

    const offset = getHorizontalOffset(depth);

    state.codeLine = 11;
    state.stepId = stepCounter++;
    state.description = `递归构造 ${currentId}->lchild，进入左子树。`;
    state.highlights = [currentId];
    state.nodeCursors = cursorState(currentId);
    yield clone(state);
    yield* createSubtree(depth + 1, x - offset, `${path}L`, currentId, 'left');

    state.codeLine = 12;
    state.stepId = stepCounter++;
    state.description = `左子树处理完成，递归构造 ${currentId}->rchild。`;
    state.highlights = [currentId];
    state.nodeCursors = cursorState(currentId);
    yield clone(state);
    yield* createSubtree(depth + 1, x + offset, `${path}R`, currentId, 'right');

    state.codeLine = 13;
    state.stepId = stepCounter++;
    state.description = `${currentId} 的左右子树均已构造完成，返回该结点指针。`;
    state.variables = { ...state.variables, T: currentId };
    state.highlights = [currentId];
    state.nodeCursors = cursorState(currentId);
    yield clone(state);
    return currentId;
  }

  yield* createSubtree(0, ROOT_X, '', null, null);

  state.codeLine = 14;
  state.stepId = stepCounter++;
  state.description = '递归建树完成：所有非空结点通过 lchild / rchild 指针连成链式二叉树。';
  state.variables = { ...state.variables, T: state.nodes[0]?.id ?? 'NULL', index: String(Math.min(tokenIndex, tokens.length)) };
  state.highlights = [];
  state.nodeCursors = {};
  yield clone(state);
}

function* generateTraversalStates(
  tokens: TreeToken[],
  order: TraversalOrder,
): Generator<AnimationState, void, undefined> {
  const root = buildBinaryTree(tokens);
  const { nodes, pointers } = flattenTree(root);
  let stepCounter = 1;
  const visitedValues: number[] = [];
  const visitedIds: string[] = [];
  const title = traversalTitle(order);

  const state: AnimationState = {
    stepId: 0,
    codeLine: 1,
    description: `初始化：在当前链式二叉树上执行递归${title}。`,
    variables: { T: root?.id ?? 'NULL', depth: '0', operation: '初始化', result: '[]' },
    nodes,
    pointers,
    highlights: [],
    nodeCursors: {},
  };
  yield clone(state);

  function* enterNull(branchText: string, depth: number): Generator<AnimationState, void, undefined> {
    state.codeLine = 2;
    state.stepId = stepCounter++;
    state.description = `${branchText} 指向 NULL，满足递归出口，直接返回。`;
    state.variables = { ...state.variables, T: 'NULL', depth: String(depth), operation: '返回' };
    state.highlights = [];
    state.activeNodes = [...visitedIds];
    state.activeEdges = [];
    state.nodeCursors = {};
    yield clone(state);
  }

  function* visitNode(node: BinaryTreeNode, lineNumber: number, depth: number): Generator<AnimationState, void, undefined> {
    visitedValues.push(node.value);
    visitedIds.push(node.id);
    state.codeLine = lineNumber;
    state.stepId = stepCounter++;
    state.description = `执行 visit(T)：访问当前结点 ${node.id}，输出 ${node.value}，结果为 [${visitedValues.join(', ')}]。`;
    state.variables = { ...state.variables, T: node.id, depth: String(depth), operation: '访问根', result: `[${visitedValues.join(', ')}]` };
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = [];
    state.nodeCursors = cursorState(node.id, 'visit');
    yield clone(state);
  }

  function* traverse(node: BinaryTreeNode | null, branchText: string, depth: number): Generator<AnimationState, void, undefined> {
    if (!node) {
      yield* enterNull(branchText, depth);
      return;
    }

    state.codeLine = 2;
    state.stepId = stepCounter++;
    state.description = `进入 ${order === 'preorder' ? 'PreOrder' : order === 'inorder' ? 'InOrder' : 'PostOrder'}(T)：判断 T != NULL，当前 T 指向 ${node.id}。`;
    state.variables = { ...state.variables, T: node.id, depth: String(depth), operation: '判断 T' };
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);

    if (order === 'preorder') yield* visitNode(node, 3, depth);

    state.codeLine = order === 'postorder' ? 3 : order === 'inorder' ? 3 : 4;
    state.stepId = stepCounter++;
    state.description = `递归遍历左子树：沿 ${node.id}->lchild 进入下一层。`;
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = node.left ? [`p_${node.id}_left_${node.left.id}`] : [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);
    yield* traverse(node.left, `${node.id}->lchild`, depth + 1);

    state.codeLine = order === 'postorder' ? 3 : order === 'inorder' ? 3 : 4;
    state.stepId = stepCounter++;
    state.description = `${node.id} 的左子树返回，回到当前递归帧。`;
    state.variables = { ...state.variables, T: node.id, depth: String(depth), operation: '左子树返回' };
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);

    if (order === 'inorder') yield* visitNode(node, 4, depth);

    state.codeLine = order === 'postorder' ? 4 : order === 'inorder' ? 5 : 5;
    state.stepId = stepCounter++;
    state.description = `递归遍历右子树：沿 ${node.id}->rchild 进入下一层。`;
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = node.right ? [`p_${node.id}_right_${node.right.id}`] : [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);
    yield* traverse(node.right, `${node.id}->rchild`, depth + 1);

    state.codeLine = order === 'postorder' ? 4 : order === 'inorder' ? 5 : 5;
    state.stepId = stepCounter++;
    state.description = `${node.id} 的右子树返回，回到当前递归帧。`;
    state.variables = { ...state.variables, T: node.id, depth: String(depth), operation: '右子树返回' };
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);

    if (order === 'postorder') yield* visitNode(node, 5, depth);

    state.codeLine = 6;
    state.stepId = stepCounter++;
    state.description = `${node.id} 对应递归帧结束，返回上一层。`;
    state.variables = { ...state.variables, T: node.id, depth: String(depth), operation: '返回' };
    state.highlights = [node.id];
    state.activeNodes = [...visitedIds, node.id];
    state.activeEdges = [];
    state.nodeCursors = cursorState(node.id);
    yield clone(state);
  }

  yield* traverse(root, 'root', 0);

  state.codeLine = 6;
  state.stepId = stepCounter++;
  state.description = `${title}完成，最终访问序列为 [${visitedValues.join(', ')}]。`;
  state.variables = { ...state.variables, T: 'NULL', depth: '0', operation: '完成', result: `[${visitedValues.join(', ')}]` };
  state.highlights = [];
  state.activeNodes = [...visitedIds];
  state.activeEdges = [];
  state.nodeCursors = {};
  yield clone(state);
}

export function generateBinaryTreePreorderStates(tokens: TreeToken[]): Generator<AnimationState, void, undefined> {
  return generateTraversalStates(tokens, 'preorder');
}

export function generateBinaryTreeInorderStates(tokens: TreeToken[]): Generator<AnimationState, void, undefined> {
  return generateTraversalStates(tokens, 'inorder');
}

export function generateBinaryTreePostorderStates(tokens: TreeToken[]): Generator<AnimationState, void, undefined> {
  return generateTraversalStates(tokens, 'postorder');
}

export function* generateBinaryTreePropertiesStates(
  tokens: TreeToken[],
): Generator<AnimationState, void, undefined> {
  const root = buildBinaryTree(tokens);
  const { nodes, pointers } = flattenTree(root);
  const total = countNodes(root);
  const leafIds = collectByDegree(root, 0);
  const oneChildIds = collectByDegree(root, 1);
  const twoChildIds = collectByDegree(root, 2);
  const height = treeHeight(root);

  const state: AnimationState = {
    stepId: 0,
    codeLine: 1,
    description: '初始化：基于当前链式二叉树统计结点度数、叶结点数和树高。',
    variables: {
      n: String(total),
      n0: String(leafIds.length),
      n1: String(oneChildIds.length),
      n2: String(twoChildIds.length),
      height: String(height),
    },
    nodes,
    pointers,
    highlights: [],
    nodeCursors: {},
  };
  yield clone(state);

  state.stepId = 1;
  state.codeLine = 3;
  state.description = `统计叶结点：度为 0 的结点共有 n0 = ${leafIds.length} 个。`;
  state.highlights = leafIds;
  yield clone(state);

  state.stepId = 2;
  state.codeLine = 4;
  state.description = `统计度为 2 的结点：n2 = ${twoChildIds.length}，验证性质 n0 = n2 + 1，即 ${leafIds.length} = ${twoChildIds.length} + 1。`;
  state.highlights = twoChildIds;
  yield clone(state);

  state.stepId = 3;
  state.codeLine = 7;
  state.description = `结点总数满足 n = n0 + n1 + n2 = ${leafIds.length} + ${oneChildIds.length} + ${twoChildIds.length} = ${total}。`;
  state.highlights = [...leafIds, ...oneChildIds, ...twoChildIds];
  yield clone(state);

  state.stepId = 4;
  state.codeLine = 10;
  state.description = `树高 h = ${height}，第 i 层最多有 2^(i-1) 个结点，深度为 h 的二叉树最多有 2^h - 1 个结点。`;
  state.highlights = nodes.map((node) => node.id);
  yield clone(state);

  state.stepId = 5;
  state.codeLine = 12;
  state.description = '性质演示完成：这些公式来自二叉树链式结构中分支数与结点度数的关系。';
  state.highlights = [];
  yield clone(state);
}
