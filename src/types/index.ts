// ============================================================
// src/types/index.ts — V6
// 新增：pie_wedge、扇形角度、isActive、initialIndex 支持
// ============================================================

export type NodeType =
  | 'head' | 'normal' | 'array' | 'stack' | 'queue' | 'pie_wedge' | 'tree' | 'graph'
  | 'search' | 'sort' | 'heap' | 'adj-list-head' | 'adj-list-arc';
export type NodeStatus = 'normal' | 'deleting';
export type PointerType = 'solid' | 'dashed';
export type VisualPointerType = 'variable' | 'next' | 'index' | 'tree-edge' | 'graph-edge';
export type PointerDirection = 'up' | 'down' | 'left' | 'right';
export type PointerColor = 'normal' | 'active' | 'warning' | 'success';

export interface Node {
  id: string;
  val: string | number;
  x: number;
  y: number;
  type: NodeType;
  status?: NodeStatus;
  /** 扇形起始角（弧度），仅 pie_wedge */
  startAngle?: number;
  /** 扇形结束角（弧度），仅 pie_wedge */
  endAngle?: number;
  /** 是否为活跃数据槽位（front→rear 区间），队列专用 */
  isActive?: boolean;
}

export interface Pointer {
  id: string;
  from?: string;
  to?: string;
  type?: PointerType | VisualPointerType;
  label?: string;
  directed?: boolean;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  direction?: PointerDirection;
  active?: boolean;
  dashed?: boolean;
  color?: PointerColor;
}

export interface GraphVertex {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

export interface AnimationState {
  stepId: number;
  codeLine: number;
  description: string;
  variables: Record<string, string>;
  nodes: Node[];
  pointers: Pointer[];
  highlights: string[];
  graphMatrix?: number[][];
  graphVertices?: GraphVertex[];
  graphEdges?: GraphEdge[];
  matrixHighlights?: string[];
  searchRange?: {
    low: number;
    high: number;
    mid?: number;
  };
  sortMeta?: {
    sortedIndices?: number[];
    activeRange?: [number, number];
    pivotIndex?: number;
    heapSize?: number;
  };
  adjacencyList?: Record<string, string[]>;
  nodeCursors?: Record<string, string[]>;
  activePointers?: string[];
  activeNodes?: string[];
  activeEdges?: string[];
  movingNodeIds?: string[];
  operationPhase?: string;
  isWarning?: boolean;
}

export interface MenuGroup {
  title: string;
  icon: string;
  items: MenuItem[];
}

export type MenuItem = string | { label: string; children: string[] };

export type ModuleId =
  | '顺序表' | '单链表'
  | '顺序栈' | '普通队列' | '环形队列'
  | '二叉树' | '二叉树的性质' | '哈夫曼树'
  | '二叉树转换' | '遍历与哈夫曼'
  | '存储结构-邻接矩阵' | '存储结构-邻接链表'
  | '广度优先搜索-BFS' | '深度优先搜索-DFS'
  | '折半查找' | '哈希表(线性探测)'
  | '直接插入排序' | '快速排序' | '堆排序';

export type OperationType =
  | 'headInsert' | 'tailInsert' | 'find' | 'insert' | 'delete'
  | 'seqInit' | 'seqInsert' | 'seqDelete' | 'seqFind'
  | 'stackInit' | 'stackPush' | 'stackPop'
  | 'circularQueueInit' | 'queueEnqueue' | 'queueDequeue'
  | 'normalQueueInit' | 'seqQueueEnqueue' | 'seqQueueDequeue' | 'seqQueueFind'
  | 'binaryTreeBuild' | 'binaryTreePreorder' | 'binaryTreeInorder' | 'binaryTreePostorder' | 'binaryTreeProperties'
  | 'graphMatrix' | 'graphAddEdge' | 'graphBfs' | 'graphDfs' | 'graphPlaceholder' | 'graphAdjList'
  | 'binarySearch'
  | 'insertionSort' | 'quickSort' | 'heapSort' | 'createSortArray' | 'shuffleSortArray'
  | 'document';

export type PlaySpeed = 500 | 1000 | 2000;

export const PLAY_SPEED_LABELS: Record<PlaySpeed, string> = {
  2000: '0.5x 慢速', 1000: '1.0x 正常', 500: '2.0x 快速',
} as const;

export const PLAY_SPEEDS: readonly PlaySpeed[] = [2000, 1000, 500] as const;
