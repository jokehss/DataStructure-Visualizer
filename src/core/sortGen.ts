import type { AnimationState, Node, Pointer } from '@/types';

const BASE_X = 100;
const ARRAY_Y = 120;
const HEAP_Y = 270;
const CELL_W = 56;
const GAP = 10;

function sortedSet(indices: number[] = []): Set<number> {
  return new Set(indices);
}

function arrayNodes(array: number[], highlights: string[] = [], sortedIndices: number[] = [], y = ARRAY_Y): Node[] {
  const sorted = sortedSet(sortedIndices);
  return array.map((value, index) => ({
    id: `arr_${index}`,
    val: value,
    x: BASE_X + index * (CELL_W + GAP),
    y,
    type: 'array',
    isActive: highlights.includes(`arr_${index}`) || sorted.has(index),
  }));
}

function heapNodes(array: number[], heapSize: number): Node[] {
  return array.slice(0, heapSize).map((value, index) => {
    const level = Math.floor(Math.log2(index + 1));
    const levelStart = 2 ** level - 1;
    const pos = index - levelStart;
    const nodesInLevel = 2 ** level;
    const width = Math.max(520, nodesInLevel * 88);
    return {
      id: `heap_${index}`,
      val: value,
      x: BASE_X + width / (nodesInLevel + 1) * (pos + 1) - 42,
      y: HEAP_Y + level * 86,
      type: 'tree',
    };
  });
}

function heapPointers(heapSize: number): Pointer[] {
  const pointers: Pointer[] = [];
  for (let i = 0; i < heapSize; i++) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < heapSize) pointers.push({ id: `heap_edge_${i}_${left}`, from: `heap_${i}`, to: `heap_${left}`, type: 'tree-edge', label: 'left' });
    if (right < heapSize) pointers.push({ id: `heap_edge_${i}_${right}`, from: `heap_${i}`, to: `heap_${right}`, type: 'tree-edge', label: 'right' });
  }
  return pointers;
}

function vars(extra: Record<string, string> = {}): Record<string, string> {
  return {
    i: '-',
    j: '-',
    low: '-',
    high: '-',
    pivot: '-',
    temp: '-',
    parent: '-',
    left: '-',
    right: '-',
    largest: '-',
    heapSize: '-',
    ...extra,
  };
}

function cursorFor(items: Record<string, number>, length: number): Record<string, string[]> {
  const nodeCursors: Record<string, string[]> = {};
  for (const [name, index] of Object.entries(items)) {
    if (index < 0 || index >= length) continue;
    nodeCursors[`arr_${index}`] = [...(nodeCursors[`arr_${index}`] ?? []), name];
  }
  return nodeCursors;
}

function sortState(
  stepId: number,
  array: number[],
  codeLine: number,
  description: string,
  options: {
    cursors?: Record<string, number>;
    highlights?: string[];
    sortedIndices?: number[];
    variables?: Record<string, string>;
    activeRange?: [number, number];
    pivotIndex?: number;
    heapSize?: number;
    heap?: boolean;
  } = {},
): AnimationState {
  const rangeHighlights: string[] = [];
  if (options.activeRange) {
    const [start, end] = options.activeRange;
    for (let i = Math.max(0, start); i <= Math.min(array.length - 1, end); i++) rangeHighlights.push(`arr_${i}`);
  }
  const highlights = [...new Set([...(options.highlights ?? []), ...rangeHighlights])];
  const heapSize = options.heapSize ?? array.length;
  const heapNodeList = options.heap ? heapNodes(array, heapSize) : [];
  const heapHighlights = highlights
    .filter((id) => id.startsWith('arr_'))
    .map((id) => id.replace('arr_', 'heap_'));

  return {
    stepId,
    codeLine,
    description,
    variables: vars(options.variables),
    nodes: [...arrayNodes(array, highlights, options.sortedIndices), ...heapNodeList],
    pointers: options.heap ? heapPointers(heapSize) : [],
    highlights: [...highlights, ...heapHighlights],
    nodeCursors: cursorFor(options.cursors ?? {}, array.length),
    sortMeta: {
      sortedIndices: options.sortedIndices,
      activeRange: options.activeRange,
      pivotIndex: options.pivotIndex,
      heapSize: options.heapSize,
    },
  };
}

export function buildSortPreviewState(array: number[], description = '当前数组已显示，点击开始排序生成逐行动画。'): AnimationState {
  return sortState(1, array, 0, description);
}

export function buildSortWarningState(array: number[], description: string): AnimationState {
  return { ...buildSortPreviewState(array, description), isWarning: true };
}

export function generateInsertionSortStates(input: number[]): AnimationState[] {
  const a = [...input];
  const steps: AnimationState[] = [];
  let stepId = 1;
  steps.push(sortState(stepId++, a, 4, '初始有序区间为 a[0]，从 i = 1 开始直接插入排序。', {
    cursors: { i: Math.min(1, a.length - 1) },
    sortedIndices: [0],
    variables: { i: '1', 'sorted': '[0]' },
  }));

  for (let i = 1; i < a.length; i++) {
    steps.push(sortState(stepId++, a, 4, `for 循环进入 i = ${i}，准备把 a[${i}] 插入前面的有序区。`, {
      cursors: { i },
      highlights: [`arr_${i}`],
      sortedIndices: Array.from({ length: i }, (_, index) => index),
      variables: { i: String(i), 'sorted': `[0..${i - 1}]` },
    }));
    const temp = a[i];
    steps.push(sortState(stepId++, a, 5, `执行 temp = a[i]，temp = ${temp}。`, {
      cursors: { i },
      highlights: [`arr_${i}`],
      sortedIndices: Array.from({ length: i }, (_, index) => index),
      variables: { i: String(i), temp: String(temp), 'sorted': `[0..${i - 1}]` },
    }));
    let j = i - 1;
    steps.push(sortState(stepId++, a, 6, `执行 j = i - 1，j 指向 ${j}。`, {
      cursors: { i, j },
      highlights: [`arr_${j}`, `arr_${i}`],
      sortedIndices: Array.from({ length: i }, (_, index) => index),
      variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i - 1}]` },
    }));

    while (j >= 0 && a[j] > temp) {
      steps.push(sortState(stepId++, a, 8, `判断 a[j] > temp：${a[j]} > ${temp}，需要右移。`, {
        cursors: { i, j },
        highlights: [`arr_${j}`],
        sortedIndices: Array.from({ length: i }, (_, index) => index),
        variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i - 1}]` },
      }));
      a[j + 1] = a[j];
      steps.push(sortState(stepId++, a, 9, `执行 a[j + 1] = a[j]，元素 ${a[j]} 向右移动一格。`, {
        cursors: { i, j },
        highlights: [`arr_${j}`, `arr_${j + 1}`],
        sortedIndices: Array.from({ length: i }, (_, index) => index),
        variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i - 1}]` },
      }));
      j--;
      steps.push(sortState(stepId++, a, 10, `执行 j--，j 移动到 ${j}。`, {
        cursors: { i, j },
        highlights: j >= 0 ? [`arr_${j}`] : [],
        sortedIndices: Array.from({ length: i }, (_, index) => index),
        variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i - 1}]` },
      }));
    }

    steps.push(sortState(stepId++, a, 8, `while 条件不满足，插入位置是 j + 1 = ${j + 1}。`, {
      cursors: { i, j: Math.max(0, j) },
      highlights: [`arr_${j + 1}`],
      sortedIndices: Array.from({ length: i }, (_, index) => index),
      variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i - 1}]` },
    }));
    a[j + 1] = temp;
    steps.push(sortState(stepId++, a, 13, `执行 a[j + 1] = temp，把 ${temp} 插入到位置 ${j + 1}。`, {
      cursors: { i, j: Math.max(0, j + 1) },
      highlights: [`arr_${j + 1}`],
      sortedIndices: Array.from({ length: i + 1 }, (_, index) => index),
      variables: { i: String(i), j: String(j), temp: String(temp), 'sorted': `[0..${i}]` },
    }));
  }

  steps.push(sortState(stepId++, a, 15, `直接插入排序完成：${a.join(', ')}。`, {
    sortedIndices: a.map((_, index) => index),
    highlights: a.map((_, index) => `arr_${index}`),
  }));
  return steps;
}

export function generateQuickSortStates(input: number[]): AnimationState[] {
  const a = [...input];
  const steps: AnimationState[] = [];
  let stepId = 1;

  const partition = (left: number, right: number): number => {
    let low = left;
    let high = right;
    const pivot = a[low];
    steps.push(sortState(stepId++, a, 4, `Partition(${left}, ${right})：执行 pivot = a[low]，pivot = ${pivot}。`, {
      cursors: { low, high, pivot: low },
      activeRange: [left, right],
      pivotIndex: low,
      variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
    }));

    while (low < high) {
      steps.push(sortState(stepId++, a, 6, `判断 while (low < high)：${low} < ${high}，继续划分。`, {
        cursors: { low, high, pivot: left },
        activeRange: [left, right],
        pivotIndex: left,
        variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
      }));
      while (low < high && a[high] >= pivot) {
        steps.push(sortState(stepId++, a, 7, `从右向左比较 a[high] >= pivot：${a[high]} >= ${pivot}。`, {
          cursors: { low, high, pivot: left },
          highlights: [`arr_${high}`],
          activeRange: [left, right],
          pivotIndex: left,
          variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
        }));
        high--;
        steps.push(sortState(stepId++, a, 8, `执行 high--，high 移动到 ${high}。`, {
          cursors: { low, high, pivot: left },
          activeRange: [left, right],
          pivotIndex: left,
          variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
        }));
      }
      a[low] = a[high];
      steps.push(sortState(stepId++, a, 10, `执行 a[low] = a[high]，把较小元素移到左侧空位。`, {
        cursors: { low, high, pivot: left },
        highlights: [`arr_${low}`, `arr_${high}`],
        activeRange: [left, right],
        pivotIndex: left,
        variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
      }));
      while (low < high && a[low] <= pivot) {
        steps.push(sortState(stepId++, a, 12, `从左向右比较 a[low] <= pivot：${a[low]} <= ${pivot}。`, {
          cursors: { low, high, pivot: left },
          highlights: [`arr_${low}`],
          activeRange: [left, right],
          pivotIndex: left,
          variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
        }));
        low++;
        steps.push(sortState(stepId++, a, 13, `执行 low++，low 移动到 ${low}。`, {
          cursors: { low, high, pivot: left },
          activeRange: [left, right],
          pivotIndex: left,
          variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
        }));
      }
      a[high] = a[low];
      steps.push(sortState(stepId++, a, 15, `执行 a[high] = a[low]，把较大元素移到右侧空位。`, {
        cursors: { low, high, pivot: left },
        highlights: [`arr_${low}`, `arr_${high}`],
        activeRange: [left, right],
        pivotIndex: left,
        variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
      }));
    }

    a[low] = pivot;
    steps.push(sortState(stepId++, a, 18, `划分结束，执行 a[low] = pivot，pivot 最终落在 ${low}。`, {
      cursors: { low, high, pivot: low },
      highlights: [`arr_${low}`],
      activeRange: [left, right],
      pivotIndex: low,
      sortedIndices: [low],
      variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
    }));
    steps.push(sortState(stepId++, a, 19, `return low，返回枢轴位置 ${low}。`, {
      cursors: { low, high, pivot: low },
      highlights: [`arr_${low}`],
      activeRange: [left, right],
      pivotIndex: low,
      sortedIndices: [low],
      variables: { low: String(low), high: String(high), pivot: String(pivot), 'range': `[${left}, ${right}]` },
    }));
    return low;
  };

  const quickSort = (low: number, high: number) => {
    steps.push(sortState(stepId++, a, 24, `QuickSort(${low}, ${high})：判断 low < high。`, {
      cursors: { low, high },
      activeRange: [Math.max(0, low), Math.min(a.length - 1, high)],
      variables: { low: String(low), high: String(high), 'range': `[${low}, ${high}]` },
    }));
    if (low < high) {
      const pivotPos = partition(low, high);
      steps.push(sortState(stepId++, a, 26, `递归排序左区间 [${low}, ${pivotPos - 1}]。`, {
        activeRange: [low, Math.max(low, pivotPos - 1)],
        variables: { low: String(low), high: String(pivotPos - 1), pivot: String(a[pivotPos]), 'range': `[${low}, ${pivotPos - 1}]` },
      }));
      quickSort(low, pivotPos - 1);
      steps.push(sortState(stepId++, a, 27, `递归排序右区间 [${pivotPos + 1}, ${high}]。`, {
        activeRange: [Math.min(high, pivotPos + 1), high],
        variables: { low: String(pivotPos + 1), high: String(high), pivot: String(a[pivotPos]), 'range': `[${pivotPos + 1}, ${high}]` },
      }));
      quickSort(pivotPos + 1, high);
    } else {
      steps.push(sortState(stepId++, a, 24, `区间 [${low}, ${high}] 为空或只有一个元素，返回。`, {
        variables: { low: String(low), high: String(high), 'range': `[${low}, ${high}]` },
      }));
    }
  };

  quickSort(0, a.length - 1);
  steps.push(sortState(stepId++, a, 29, `快速排序完成：${a.join(', ')}。`, {
    sortedIndices: a.map((_, index) => index),
    highlights: a.map((_, index) => `arr_${index}`),
  }));
  return steps;
}

export function generateHeapSortStates(input: number[]): AnimationState[] {
  const a = [...input];
  const steps: AnimationState[] = [];
  let stepId = 1;

  const adjust = (n: number, startParent: number) => {
    let parent = startParent;
    let largest = parent;
    steps.push(sortState(stepId++, a, 10, `HeapAdjust(a, ${n}, ${parent})：largest 初始为 parent。`, {
      cursors: { parent, largest },
      highlights: [`arr_${parent}`],
      variables: { heapSize: String(n), parent: String(parent), largest: String(largest) },
      heapSize: n,
      heap: true,
    }));
    while (true) {
      const left = 2 * parent + 1;
      const right = 2 * parent + 2;
      largest = parent;
      steps.push(sortState(stepId++, a, 13, `计算 left = 2 * parent + 1，right = 2 * parent + 2。`, {
        cursors: { parent, left, right, largest },
        highlights: [`arr_${parent}`, ...(left < n ? [`arr_${left}`] : []), ...(right < n ? [`arr_${right}`] : [])],
        variables: { heapSize: String(n), parent: String(parent), left: String(left), right: String(right), largest: String(largest) },
        heapSize: n,
        heap: true,
      }));
      if (left < n && a[left] > a[largest]) {
        largest = left;
        steps.push(sortState(stepId++, a, 17, `左孩子 ${a[left]} 大于当前 largest，largest = left。`, {
          cursors: { parent, left, right, largest },
          highlights: [`arr_${left}`],
          variables: { heapSize: String(n), parent: String(parent), left: String(left), right: String(right), largest: String(largest) },
          heapSize: n,
          heap: true,
        }));
      }
      if (right < n && a[right] > a[largest]) {
        largest = right;
        steps.push(sortState(stepId++, a, 21, `右孩子 ${a[right]} 更大，largest = right。`, {
          cursors: { parent, left, right, largest },
          highlights: [`arr_${right}`],
          variables: { heapSize: String(n), parent: String(parent), left: String(left), right: String(right), largest: String(largest) },
          heapSize: n,
          heap: true,
        }));
      }
      steps.push(sortState(stepId++, a, 24, `判断 largest == parent：${largest} ${largest === parent ? '==' : '!='} ${parent}。`, {
        cursors: { parent, left, right, largest },
        highlights: [`arr_${parent}`, `arr_${largest}`],
        variables: { heapSize: String(n), parent: String(parent), left: String(left), right: String(right), largest: String(largest) },
        heapSize: n,
        heap: true,
      }));
      if (largest === parent) break;
      [a[parent], a[largest]] = [a[largest], a[parent]];
      steps.push(sortState(stepId++, a, 28, `执行 Swap(&a[parent], &a[largest])，交换 ${parent} 和 ${largest}。`, {
        cursors: { parent, left, right, largest },
        highlights: [`arr_${parent}`, `arr_${largest}`],
        variables: { heapSize: String(n), parent: String(parent), left: String(left), right: String(right), largest: String(largest) },
        heapSize: n,
        heap: true,
      }));
      parent = largest;
      steps.push(sortState(stepId++, a, 29, `执行 parent = largest，继续向下调整 parent = ${parent}。`, {
        cursors: { parent },
        highlights: [`arr_${parent}`],
        variables: { heapSize: String(n), parent: String(parent), largest: String(largest) },
        heapSize: n,
        heap: true,
      }));
    }
  };

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
    steps.push(sortState(stepId++, a, 34, `建堆阶段：从最后一个非叶子结点 i = ${i} 开始调整。`, {
      cursors: { i },
      highlights: [`arr_${i}`],
      variables: { i: String(i), heapSize: String(a.length) },
      heapSize: a.length,
      heap: true,
    }));
    adjust(a.length, i);
  }

  const sorted: number[] = [];
  for (let i = a.length - 1; i > 0; i--) {
    steps.push(sortState(stepId++, a, 39, `排序阶段：交换堆顶 a[0] 和 a[${i}]。`, {
      cursors: { i },
      highlights: ['arr_0', `arr_${i}`],
      sortedIndices: sorted,
      variables: { i: String(i), heapSize: String(i + 1) },
      heapSize: i + 1,
      heap: true,
    }));
    [a[0], a[i]] = [a[i], a[0]];
    sorted.push(i);
    steps.push(sortState(stepId++, a, 39, `a[${i}] 进入已排序区，heapSize 减为 ${i}。`, {
      cursors: { i },
      highlights: ['arr_0', `arr_${i}`],
      sortedIndices: sorted,
      variables: { i: String(i), heapSize: String(i) },
      heapSize: i,
      heap: true,
    }));
    steps.push(sortState(stepId++, a, 40, `对新的堆顶执行 HeapAdjust(a, ${i}, 0)。`, {
      cursors: { parent: 0 },
      highlights: ['arr_0'],
      sortedIndices: sorted,
      variables: { i: String(i), heapSize: String(i), parent: '0' },
      heapSize: i,
      heap: true,
    }));
    adjust(i, 0);
  }

  steps.push(sortState(stepId++, a, 42, `堆排序完成：${a.join(', ')}。`, {
    sortedIndices: a.map((_, index) => index),
    highlights: a.map((_, index) => `arr_${index}`),
    heapSize: 0,
  }));
  return steps;
}
