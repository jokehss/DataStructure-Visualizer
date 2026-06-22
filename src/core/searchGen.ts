import type { AnimationState, Node } from '@/types';

const BASE_X = 120;
const BASE_Y = 190;
const CELL_W = 56;
const GAP = 10;

function arrayNodes(array: number[], highlights: string[] = []): Node[] {
  return array.map((value, index) => ({
    id: `arr_${index}`,
    val: value,
    x: BASE_X + index * (CELL_W + GAP),
    y: BASE_Y,
    type: 'array',
    isActive: highlights.includes(`arr_${index}`),
  }));
}

function vars(extra: Record<string, string> = {}): Record<string, string> {
  return {
    low: '-',
    high: '-',
    mid: '-',
    key: '-',
    'arr[mid]': '-',
    ...extra,
  };
}

function makeState(
  stepId: number,
  array: number[],
  codeLine: number,
  description: string,
  options: {
    low?: number;
    high?: number;
    mid?: number;
    key?: number;
    highlights?: string[];
    isWarning?: boolean;
  } = {},
): AnimationState {
  const { low, high, mid, key } = options;
  const nodeCursors: Record<string, string[]> = {};
  if (low !== undefined && low >= 0 && low < array.length) nodeCursors[`arr_${low}`] = [...(nodeCursors[`arr_${low}`] ?? []), 'low'];
  if (mid !== undefined && mid >= 0 && mid < array.length) nodeCursors[`arr_${mid}`] = [...(nodeCursors[`arr_${mid}`] ?? []), 'mid'];
  if (high !== undefined && high >= 0 && high < array.length) nodeCursors[`arr_${high}`] = [...(nodeCursors[`arr_${high}`] ?? []), 'high'];

  const rangeHighlights: string[] = [];
  if (low !== undefined && high !== undefined) {
    for (let i = Math.max(0, low); i <= Math.min(array.length - 1, high); i++) {
      rangeHighlights.push(`arr_${i}`);
    }
  }

  return {
    stepId,
    codeLine,
    description,
    variables: vars({
      low: low === undefined ? '-' : String(low),
      high: high === undefined ? '-' : String(high),
      mid: mid === undefined ? '-' : String(mid),
      key: key === undefined ? '-' : String(key),
      'arr[mid]': mid === undefined || mid < 0 || mid >= array.length ? '-' : String(array[mid]),
    }),
    nodes: arrayNodes(array, rangeHighlights),
    pointers: [],
    highlights: [...new Set([...(options.highlights ?? []), ...(mid !== undefined ? [`arr_${mid}`] : [])])],
    nodeCursors,
    searchRange: low !== undefined && high !== undefined ? { low, high, mid } : undefined,
    isWarning: options.isWarning,
  };
}

export function buildBinarySearchPreviewState(array: number[], description = '折半查找要求顺序表有序，当前数组已按升序显示。'): AnimationState {
  return makeState(1, array, 0, description, { low: 0, high: array.length - 1 });
}

export function buildBinarySearchWarningState(array: number[], description: string): AnimationState {
  return { ...buildBinarySearchPreviewState(array, description), isWarning: true };
}

export function generateBinarySearchStates(array: number[], key: number): AnimationState[] {
  const steps: AnimationState[] = [];
  let stepId = 1;
  let low = 0;
  let high = array.length - 1;

  steps.push(makeState(stepId++, array, 4, '执行 low = 0，low 指向查找区间左端。', { low, high, key }));
  steps.push(makeState(stepId++, array, 5, '执行 high = n - 1，high 指向查找区间右端。', { low, high, key }));

  while (low <= high) {
    steps.push(makeState(stepId++, array, 7, `判断 while (low <= high)：${low} <= ${high}，继续查找。`, { low, high, key }));
    const mid = Math.floor((low + high) / 2);
    steps.push(makeState(stepId++, array, 8, `执行 mid = (low + high) / 2，mid = ${mid}。`, {
      low,
      high,
      mid,
      key,
      highlights: [`arr_${mid}`],
    }));
    steps.push(makeState(stepId++, array, 10, `比较 a[mid] == key：${array[mid]} 与 ${key}。`, {
      low,
      high,
      mid,
      key,
      highlights: [`arr_${mid}`],
    }));

    if (array[mid] === key) {
      steps.push(makeState(stepId++, array, 11, `找到 key = ${key}，return mid = ${mid}。`, {
        low,
        high,
        mid,
        key,
        highlights: [`arr_${mid}`],
      }));
      return steps;
    }

    steps.push(makeState(stepId++, array, 12, `判断 key < a[mid]：${key} < ${array[mid]}。`, {
      low,
      high,
      mid,
      key,
      highlights: [`arr_${mid}`],
    }));

    if (key < array[mid]) {
      high = mid - 1;
      steps.push(makeState(stepId++, array, 13, `执行 high = mid - 1，high 移动到 ${high}。`, {
        low,
        high,
        mid,
        key,
        highlights: mid - 1 >= 0 ? [`arr_${mid - 1}`] : [],
      }));
    } else {
      low = mid + 1;
      steps.push(makeState(stepId++, array, 15, `执行 low = mid + 1，low 移动到 ${low}。`, {
        low,
        high,
        mid,
        key,
        highlights: mid + 1 < array.length ? [`arr_${mid + 1}`] : [],
      }));
    }
  }

  steps.push(makeState(stepId++, array, 7, `判断 while (low <= high)：${low} > ${high}，循环结束。`, { low, high, key }));
  steps.push(makeState(stepId++, array, 19, `没有找到 key = ${key}，return -1。`, { low, high, key, isWarning: true }));
  return steps;
}
