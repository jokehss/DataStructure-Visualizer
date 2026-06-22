import type { AnimationState, GraphEdge, GraphVertex, Node, Pointer } from '@/types';

const HEAD_X = 80;
const ARC_X = 210;
const TEMP_X = 620;
const BASE_Y = 80;
const ROW_GAP = 82;
const ARC_GAP = 92;

function edgeId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function toEdges(vertices: GraphVertex[], matrix: number[][]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (matrix[i]?.[j] === 1) {
        edges.push({ id: `edge_${edgeId(vertices[i].id, vertices[j].id)}`, from: vertices[i].id, to: vertices[j].id });
      }
    }
  }
  return edges;
}

export function buildAdjacencyList(vertices: GraphVertex[], matrix: number[][]): Record<string, string[]> {
  const list: Record<string, string[]> = {};
  vertices.forEach((vertex, i) => {
    list[vertex.label] = [];
    vertices.forEach((target, j) => {
      if (matrix[i]?.[j] === 1) list[vertex.label].push(target.label);
    });
  });
  return list;
}

function buildNodes(vertices: GraphVertex[], adjacencyList: Record<string, string[]>, temp?: { row: number; label: string; id: string }): Node[] {
  const nodes: Node[] = [];
  vertices.forEach((vertex, row) => {
    const y = BASE_Y + row * ROW_GAP;
    nodes.push({
      id: `adj_head_${vertex.label}`,
      val: vertex.label,
      x: HEAD_X,
      y,
      type: 'adj-list-head',
    });
    (adjacencyList[vertex.label] ?? []).forEach((target, index) => {
      nodes.push({
        id: `adj_arc_${vertex.label}_${target}`,
        val: target,
        x: ARC_X + index * ARC_GAP,
        y,
        type: 'adj-list-arc',
      });
    });
  });
  if (temp) {
    nodes.push({
      id: temp.id,
      val: temp.label,
      x: TEMP_X,
      y: BASE_Y + temp.row * ROW_GAP - 52,
      type: 'adj-list-arc',
    });
  }
  return nodes;
}

function buildPointers(vertices: GraphVertex[], adjacencyList: Record<string, string[]>, temp?: { fromLabel: string; targetLabel?: string; id: string }): Pointer[] {
  const pointers: Pointer[] = [];
  vertices.forEach((vertex) => {
    const neighbors = adjacencyList[vertex.label] ?? [];
    const headId = `adj_head_${vertex.label}`;
    if (neighbors.length === 0) {
      pointers.push({ id: `first_${vertex.label}_NULL`, from: headId, to: 'NULL', type: 'next', label: 'first' });
      return;
    }
    pointers.push({ id: `first_${vertex.label}_${neighbors[0]}`, from: headId, to: `adj_arc_${vertex.label}_${neighbors[0]}`, type: 'next', label: 'first' });
    neighbors.forEach((target, index) => {
      const next = neighbors[index + 1];
      pointers.push({
        id: `next_${vertex.label}_${target}`,
        from: `adj_arc_${vertex.label}_${target}`,
        to: next ? `adj_arc_${vertex.label}_${next}` : 'NULL',
        type: 'next',
        label: 'next',
      });
    });
  });
  if (temp) {
    pointers.push({
      id: `pNew_${temp.id}`,
      from: temp.id,
      to: temp.targetLabel ? `adj_arc_${temp.fromLabel}_${temp.targetLabel}` : 'NULL',
      type: 'next',
      label: 'next',
      active: true,
      color: 'active',
    });
  }
  return pointers;
}

function makeState(
  stepId: number,
  vertices: GraphVertex[],
  matrix: number[][],
  codeLine: number,
  description: string,
  options: {
    adjacencyList?: Record<string, string[]>;
    temp?: { row: number; label: string; id: string; fromLabel: string; targetLabel?: string };
    highlights?: string[];
    variables?: Record<string, string>;
    isWarning?: boolean;
  } = {},
): AnimationState {
  const adjacencyList = options.adjacencyList ?? buildAdjacencyList(vertices, matrix);
  return {
    stepId,
    codeLine,
    description,
    variables: {
      i: '-',
      j: '-',
      pNew: '-',
      firstedge: '-',
      arcnum: String(toEdges(vertices, matrix).length),
      ...(options.variables ?? {}),
    },
    nodes: buildNodes(vertices, adjacencyList, options.temp),
    pointers: buildPointers(vertices, adjacencyList, options.temp),
    highlights: options.highlights ?? [],
    graphVertices: vertices.map((vertex) => ({ ...vertex })),
    graphMatrix: matrix.map((row) => [...row]),
    graphEdges: toEdges(vertices, matrix),
    adjacencyList,
    isWarning: options.isWarning,
  };
}

export function buildGraphAdjListPreviewState(
  vertices: GraphVertex[],
  matrix: number[][],
  description = '邻接链表根据当前图的顶点和边自动生成。',
): AnimationState {
  return makeState(1, vertices, matrix, 0, description);
}

export function buildGraphAdjListWarningState(vertices: GraphVertex[], matrix: number[][], description: string): AnimationState {
  return { ...buildGraphAdjListPreviewState(vertices, matrix, description), isWarning: true };
}

export function generateGraphAdjListAddEdgeStates(
  vertices: GraphVertex[],
  matrix: number[][],
  fromIndex: number,
  toIndex: number,
): AnimationState[] {
  const from = vertices[fromIndex];
  const to = vertices[toIndex];
  const before = matrix.map((row) => [...row]);
  before[fromIndex][toIndex] = 0;
  before[toIndex][fromIndex] = 0;
  const beforeList = buildAdjacencyList(vertices, before);
  const afterList = buildAdjacencyList(vertices, matrix);
  const steps: AnimationState[] = [];
  let stepId = 1;

  steps.push(makeState(stepId++, vertices, before, 30, `LocateVex 找到 ${from.label} 和 ${to.label} 的下标：i = ${fromIndex}，j = ${toIndex}。`, {
    adjacencyList: beforeList,
    highlights: [`adj_head_${from.label}`, `adj_head_${to.label}`],
    variables: { i: String(fromIndex), j: String(toIndex) },
  }));

  const insertOne = (owner: GraphVertex, target: GraphVertex, ownerIndex: number, targetIndex: number, mallocLine: number, adjLine: number, nextLine: number, firstLine: number, tempId: string) => {
    const oldFirst = beforeList[owner.label]?.[0];
    steps.push(makeState(stepId++, vertices, before, mallocLine, `为 ${owner.label} 的边表创建新边表结点 pNew。`, {
      adjacencyList: beforeList,
      temp: { row: ownerIndex, label: target.label, id: tempId, fromLabel: owner.label, targetLabel: oldFirst },
      highlights: [tempId],
      variables: { i: String(ownerIndex), j: String(targetIndex), pNew: target.label, firstedge: oldFirst ?? 'NULL' },
    }));
    steps.push(makeState(stepId++, vertices, before, adjLine, `执行 pNew->adjvex = ${targetIndex}，新边表结点记录邻接点 ${target.label}。`, {
      adjacencyList: beforeList,
      temp: { row: ownerIndex, label: target.label, id: tempId, fromLabel: owner.label, targetLabel: oldFirst },
      highlights: [tempId],
      variables: { i: String(ownerIndex), j: String(targetIndex), pNew: target.label, firstedge: oldFirst ?? 'NULL' },
    }));
    steps.push(makeState(stepId++, vertices, before, nextLine, `执行 pNew->next = G->adjList[${owner.label}].first，pNew 先指向原 firstedge。`, {
      adjacencyList: beforeList,
      temp: { row: ownerIndex, label: target.label, id: tempId, fromLabel: owner.label, targetLabel: oldFirst },
      highlights: [tempId, oldFirst ? `adj_arc_${owner.label}_${oldFirst}` : ''],
      variables: { i: String(ownerIndex), j: String(targetIndex), pNew: target.label, firstedge: oldFirst ?? 'NULL' },
    }));
    const partialList = { ...beforeList, [owner.label]: [target.label, ...(beforeList[owner.label] ?? [])] };
    steps.push(makeState(stepId++, vertices, matrix, firstLine, `执行 G->adjList[${owner.label}].first = pNew，firstedge 改为新结点 ${target.label}。`, {
      adjacencyList: partialList,
      highlights: [`adj_head_${owner.label}`, `adj_arc_${owner.label}_${target.label}`],
      variables: { i: String(ownerIndex), j: String(targetIndex), pNew: target.label, firstedge: target.label },
    }));
  };

  insertOne(from, to, fromIndex, toIndex, 33, 34, 35, 36, `adj_temp_${from.label}_${to.label}`);
  insertOne(to, from, toIndex, fromIndex, 38, 39, 40, 41, `adj_temp_${to.label}_${from.label}`);

  steps.push(makeState(stepId++, vertices, matrix, 43, `无向边 ${from.label}-${to.label} 插入完成，arcnum++，邻接链表两侧边表均已更新。`, {
    adjacencyList: afterList,
    highlights: [`adj_arc_${from.label}_${to.label}`, `adj_arc_${to.label}_${from.label}`],
    variables: { i: String(fromIndex), j: String(toIndex), arcnum: String(toEdges(vertices, matrix).length) },
  }));

  return steps;
}
