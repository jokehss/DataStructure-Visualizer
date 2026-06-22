import type { AnimationState, GraphEdge, GraphVertex, Node, Pointer } from '@/types';

function edgeId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function toEdges(vertices: GraphVertex[], matrix: number[][]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (matrix[i]?.[j] === 1) {
        edges.push({
          id: `edge_${edgeId(vertices[i].id, vertices[j].id)}`,
          from: vertices[i].id,
          to: vertices[j].id,
        });
      }
    }
  }
  return edges;
}

function toNodes(vertices: GraphVertex[]): Node[] {
  return vertices.map((vertex) => ({
    id: vertex.id,
    val: vertex.label,
    x: vertex.x,
    y: vertex.y,
    type: 'graph',
  }));
}

function toPointers(edges: GraphEdge[]): Pointer[] {
  return edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    type: 'solid',
    directed: false,
  }));
}

function vars(extra: Record<string, string> = {}): Record<string, string> {
  return {
    v: '-',
    i: '-',
    visited: '[]',
    queue: '[]',
    result: '[]',
    ...extra,
  };
}

function state(
  vertices: GraphVertex[],
  matrix: number[][],
  description: string,
  codeLine: number,
  options: {
    highlights?: string[];
    matrixHighlights?: string[];
    variables?: Record<string, string>;
    isWarning?: boolean;
  } = {},
): AnimationState {
  const edges = toEdges(vertices, matrix);
  return {
    stepId: 0,
    codeLine,
    description,
    variables: vars(options.variables),
    nodes: toNodes(vertices),
    pointers: toPointers(edges),
    highlights: options.highlights ?? [],
    graphMatrix: matrix.map((row) => [...row]),
    graphVertices: vertices.map((vertex) => ({ ...vertex })),
    graphEdges: edges,
    matrixHighlights: options.matrixHighlights ?? [],
    isWarning: options.isWarning,
  };
}

function normalizeSteps(states: AnimationState[]): AnimationState[] {
  return states.map((s, index) => ({ ...s, stepId: index + 1 }));
}

function visitedText(visited: boolean[], vertices: GraphVertex[]): string {
  return `[${visited.map((item, index) => `${vertices[index].label}:${item ? 1 : 0}`).join(', ')}]`;
}

function labels(indices: number[], vertices: GraphVertex[]): string {
  return `[${indices.map((index) => vertices[index].label).join(', ')}]`;
}

export function buildGraphPreviewState(
  vertices: GraphVertex[],
  matrix: number[][],
  description: string,
  matrixHighlights: string[] = [],
): AnimationState {
  return state(vertices, matrix, description, 0, { matrixHighlights });
}

export function generateGraphAddEdgeState(
  vertices: GraphVertex[],
  matrix: number[][],
  fromIndex: number,
  toIndex: number,
): AnimationState {
  const from = vertices[fromIndex];
  const to = vertices[toIndex];
  return state(vertices, matrix, `添加无向边 ${from.label}-${to.label}，邻接矩阵对称位置置为 1。`, 27, {
    highlights: [from.id, to.id, `edge_${edgeId(from.id, to.id)}`],
    matrixHighlights: [`matrix_${fromIndex}_${toIndex}`, `matrix_${toIndex}_${fromIndex}`],
    variables: {
      v: from.label,
      i: to.label,
      visited: '[]',
      queue: '[]',
      result: '[]',
    },
  });
}

export function* generateGraphBfsStates(
  vertices: GraphVertex[],
  matrix: number[][],
  startIndex: number,
): Generator<AnimationState, void, undefined> {
  const steps: AnimationState[] = [];
  const visited = Array(vertices.length).fill(false) as boolean[];
  const queue: number[] = [];
  const result: number[] = [];
  const start = vertices[startIndex];

  steps.push(state(vertices, matrix, '初始化 visited 数组，所有顶点标记为未访问。', 18, {
    variables: { visited: visitedText(visited, vertices), queue: labels(queue, vertices), result: labels(result, vertices) },
  }));

  visited[startIndex] = true;
  result.push(startIndex);
  steps.push(state(vertices, matrix, `访问起点 ${start.label}，输出并标记 visited[${start.label}] = 1。`, 22, {
    highlights: [start.id],
    variables: { v: start.label, visited: visitedText(visited, vertices), queue: labels(queue, vertices), result: labels(result, vertices) },
  }));

  queue.push(startIndex);
  steps.push(state(vertices, matrix, `起点 ${start.label} 入队，准备开始广度优先搜索。`, 24, {
    highlights: [start.id],
    variables: { v: start.label, visited: visitedText(visited, vertices), queue: labels(queue, vertices), result: labels(result, vertices) },
  }));

  while (queue.length > 0) {
    steps.push(state(vertices, matrix, '判断队列非空，继续循环。', 26, {
      variables: { queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
    }));

    const v = queue.shift()!;
    steps.push(state(vertices, matrix, `${vertices[v].label} 出队，检查它的所有邻接顶点。`, 27, {
      highlights: [vertices[v].id],
      variables: { v: vertices[v].label, queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
    }));

    for (let i = 0; i < vertices.length; i++) {
      steps.push(state(vertices, matrix, `for 循环检查 i = ${vertices[i].label}。`, 29, {
        highlights: [vertices[v].id],
        matrixHighlights: [`matrix_${v}_${i}`],
        variables: { v: vertices[v].label, i: vertices[i].label, queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
      }));

      const hasEdge = matrix[v]?.[i] === 1;
      const edgeHighlight = hasEdge ? [`edge_${edgeId(vertices[v].id, vertices[i].id)}`] : [];
      steps.push(state(vertices, matrix, `检查 G[${vertices[v].label}][${vertices[i].label}]：${hasEdge ? '有边' : '无边'}，visited[${vertices[i].label}] = ${visited[i] ? 1 : 0}。`, 30, {
        highlights: [vertices[v].id, ...edgeHighlight],
        matrixHighlights: [`matrix_${v}_${i}`],
        variables: { v: vertices[v].label, i: vertices[i].label, queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
      }));

      if (hasEdge && !visited[i]) {
        visited[i] = true;
        result.push(i);
        steps.push(state(vertices, matrix, `发现未访问邻接点 ${vertices[i].label}，输出并标记 visited[${vertices[i].label}] = 1。`, 31, {
          highlights: [vertices[v].id, vertices[i].id, `edge_${edgeId(vertices[v].id, vertices[i].id)}`],
          matrixHighlights: [`matrix_${v}_${i}`],
          variables: { v: vertices[v].label, i: vertices[i].label, queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
        }));
        queue.push(i);
        steps.push(state(vertices, matrix, `${vertices[i].label} 入队，等待后续扩展。`, 33, {
          highlights: [vertices[i].id, `edge_${edgeId(vertices[v].id, vertices[i].id)}`],
          matrixHighlights: [`matrix_${v}_${i}`],
          variables: { v: vertices[v].label, i: vertices[i].label, queue: labels(queue, vertices), visited: visitedText(visited, vertices), result: labels(result, vertices) },
        }));
      }
    }
  }

  const disconnected = result.length < vertices.length;
  steps.push(state(
    vertices,
    matrix,
    `BFS 访问序列：${result.map((index) => vertices[index].label).join(' -> ')}。${disconnected ? '图不连通，本次只遍历起点可达部分。' : '所有顶点均已访问。'}`,
    37,
    { variables: { visited: visitedText(visited, vertices), queue: labels(queue, vertices), result: labels(result, vertices) } },
  ));

  for (const step of normalizeSteps(steps)) yield step;
}

export function* generateGraphDfsStates(
  vertices: GraphVertex[],
  matrix: number[][],
  startIndex: number,
): Generator<AnimationState, void, undefined> {
  const steps: AnimationState[] = [];
  const visited = Array(vertices.length).fill(false) as boolean[];
  const result: number[] = [];

  steps.push(state(vertices, matrix, '初始化 visited 数组，所有顶点标记为未访问。', 17, {
    variables: { visited: visitedText(visited, vertices), result: labels(result, vertices) },
  }));
  steps.push(state(vertices, matrix, `调用 DFS(${vertices[startIndex].label})。`, 34, {
    highlights: [vertices[startIndex].id],
    variables: { v: vertices[startIndex].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
  }));

  const dfs = (v: number) => {
    visited[v] = true;
    result.push(v);
    steps.push(state(vertices, matrix, `访问顶点 ${vertices[v].label}，输出并标记 visited[${vertices[v].label}] = 1。`, 20, {
      highlights: [vertices[v].id],
      variables: { v: vertices[v].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
    }));

    for (let i = 0; i < vertices.length; i++) {
      steps.push(state(vertices, matrix, `DFS(${vertices[v].label}) 中检查 i = ${vertices[i].label}。`, 23, {
        highlights: [vertices[v].id],
        matrixHighlights: [`matrix_${v}_${i}`],
        variables: { v: vertices[v].label, i: vertices[i].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
      }));

      const hasEdge = matrix[v]?.[i] === 1;
      const edgeHighlight = hasEdge ? [`edge_${edgeId(vertices[v].id, vertices[i].id)}`] : [];
      steps.push(state(vertices, matrix, `检查 G[${vertices[v].label}][${vertices[i].label}]：${hasEdge ? '有边' : '无边'}，visited[${vertices[i].label}] = ${visited[i] ? 1 : 0}。`, 24, {
        highlights: [vertices[v].id, ...edgeHighlight],
        matrixHighlights: [`matrix_${v}_${i}`],
        variables: { v: vertices[v].label, i: vertices[i].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
      }));

      if (hasEdge && !visited[i]) {
        steps.push(state(vertices, matrix, `满足条件，递归调用 DFS(${vertices[i].label})。`, 25, {
          highlights: [vertices[v].id, vertices[i].id, `edge_${edgeId(vertices[v].id, vertices[i].id)}`],
          matrixHighlights: [`matrix_${v}_${i}`],
          variables: { v: vertices[v].label, i: vertices[i].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
        }));
        dfs(i);
        steps.push(state(vertices, matrix, `DFS(${vertices[i].label}) 返回，回溯到 ${vertices[v].label} 继续检查后续顶点。`, 28, {
          highlights: [vertices[v].id],
          variables: { v: vertices[v].label, i: vertices[i].label, visited: visitedText(visited, vertices), result: labels(result, vertices) },
        }));
      }
    }
  };

  dfs(startIndex);

  const disconnected = result.length < vertices.length;
  steps.push(state(
    vertices,
    matrix,
    `DFS 访问序列：${result.map((index) => vertices[index].label).join(' -> ')}。${disconnected ? '图不连通，本次只遍历起点可达部分。' : '所有顶点均已访问。'}`,
    35,
    { variables: { visited: visitedText(visited, vertices), result: labels(result, vertices) } },
  ));

  for (const step of normalizeSteps(steps)) yield step;
}

export function generateGraphPlaceholderState(description: string): AnimationState {
  return {
    stepId: 1,
    codeLine: 0,
    description,
    variables: vars(),
    nodes: [],
    pointers: [],
    highlights: [],
    graphMatrix: [],
    graphVertices: [],
    graphEdges: [],
    matrixHighlights: [],
    isWarning: true,
  };
}
