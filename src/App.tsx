import { useState, useCallback, useMemo, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { MemoryCanvas } from '@/components/Canvas/MemoryCanvas';
import { CodePanel } from '@/components/CodeViewer/CodePanel';
import { PlaybackBar } from '@/components/ControlPanel/PlaybackBar';
import { GraphMatrixPanel } from '@/components/Graph/GraphMatrixPanel';
import { GraphAdjListPanel } from '@/components/Graph/GraphAdjListPanel';
import { DocumentPanel } from '@/components/Document/DocumentPanel';
import { useAnimationPlayer } from '@/hooks/useAnimationPlayer';
import {
  generateHeadInsertStates, generateTailInsertStates,
  generateFindStates, generateInsertStates, generateDeleteStates,
} from '@/core/linkedListGen';
import {
  generateSeqInit, generateSeqInsert, generateSeqDelete, generateSeqFind,
} from '@/core/seqListGen';
import {
  generateStackInit, generateStackPush, generateStackPop,
  generateCircularQueueInit, generateQueueEnqueue, generateQueueDequeue,
  generateNormalQueueInit,
  generateSeqQueueEnqueue, generateSeqQueueDequeue, generateSeqQueueFind,
} from '@/core/stackQueueGen';
import {
  generateBinaryTreeBuildStates,
  generateBinaryTreePreorderStates,
  generateBinaryTreeInorderStates,
  generateBinaryTreePostorderStates,
  generateBinaryTreePropertiesStates,
} from '@/core/binaryTreeGen';
import {
  buildGraphPreviewState,
  generateGraphAddEdgeState,
  generateGraphBfsStates,
  generateGraphDfsStates,
} from '@/core/graphMatrixGen';
import {
  buildGraphAdjListPreviewState,
  buildGraphAdjListWarningState,
  generateGraphAdjListAddEdgeStates,
} from '@/core/graphAdjListGen';
import {
  buildBinarySearchPreviewState,
  buildBinarySearchWarningState,
  generateBinarySearchStates,
} from '@/core/searchGen';
import {
  buildSortPreviewState,
  buildSortWarningState,
  generateInsertionSortStates,
  generateQuickSortStates,
  generateHeapSortStates,
} from '@/core/sortGen';
import { CODE_MAP } from '@/constants/codeSnippets';
import { DOCUMENT_MAP } from '@/constants/documentContent';
import type { ModuleId, PlaySpeed, AnimationState, OperationType, GraphVertex } from '@/types';

const CQ_MAX = 8;
const SQ_MAX = 6;
const GRAPH_MAX = 10;
const MIN_CODE_WIDTH = 360;
const MAX_CODE_WIDTH = 720;
const MIN_PLAYBACK_HEIGHT = 120;
const MAX_PLAYBACK_HEIGHT = 220;
const DEFAULT_BINARY_TREE_INPUT = '1, 2, 4, #, #, 5, #, #, 3, #, 6, #, #';
const GRAPH_LABELS = 'ABCDEFGHIJ'.split('');

function collectStates(g: Generator<AnimationState, void, undefined>): AnimationState[] {
  const r: AnimationState[] = [];
  for (const s of g) r.push(s);
  return r;
}

function parseValues(raw: string): number[] {
  return raw.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v));
}

function parseNumberListStrict(raw: string): { values: number[]; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { values: [], error: '数列输入为空。' };
  const parts = trimmed.split(',').map((item) => item.trim());
  if (parts.some((item) => item === '' || Number.isNaN(Number(item)))) {
    return { values: [], error: '数列中含有非数字，请使用逗号分隔整数。' };
  }
  const values = parts.map((item) => Number(item));
  if (values.length < 2) return { values, error: '数列元素至少需要 2 个。' };
  if (values.length > 12) return { values, error: '数列元素最多支持 12 个，避免画布过挤。' };
  return { values };
}

function parseTreeTokens(raw: string): (number | null)[] {
  return raw
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      if (v === '#' || v.toLowerCase() === 'null') return null;
      const parsed = parseInt(v, 10);
      return isNaN(parsed) ? null : parsed;
    });
}

function parseSingle(raw: string): number | null {
  const v = parseInt(raw.trim(), 10);
  return isNaN(v) ? null : v;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isGraphDataModule(module: ModuleId): boolean {
  return module === '存储结构-邻接矩阵' || module === '广度优先搜索-BFS' || module === '深度优先搜索-DFS';
}

function isGraphAdjListModule(module: ModuleId): boolean {
  return module === '存储结构-邻接链表';
}

function isGraphEditModule(module: ModuleId): boolean {
  return isGraphDataModule(module) || isGraphAdjListModule(module);
}

function isBinarySearchModule(module: ModuleId): boolean {
  return module === '折半查找';
}

function isInsertionSortModule(module: ModuleId): boolean {
  return module === '直接插入排序';
}

function isQuickSortModule(module: ModuleId): boolean {
  return module === '快速排序';
}

function isHeapSortModule(module: ModuleId): boolean {
  return module === '堆排序';
}

function isSortModule(module: ModuleId): boolean {
  return isInsertionSortModule(module) || isQuickSortModule(module) || isHeapSortModule(module);
}

function isHuffmanModule(module: ModuleId): boolean {
  return module === '哈夫曼树';
}

function isDocumentModule(module: ModuleId): boolean {
  return module === '二叉树的性质' || isHuffmanModule(module);
}

function normalizeGraphLabel(value: string): string {
  return value.trim().toUpperCase();
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('单链表');
  const [inputArray, setInputArray] = useState('10, 20, 30');
  const [findTarget, setFindTarget] = useState('20');
  const [modifyIndex, setModifyIndex] = useState('2');
  const [modifyValue, setModifyValue] = useState('99');
  const [stackValue, setStackValue] = useState('42');
  const [queueValue, setQueueValue] = useState('7');
  const [seqQueueValue, setSeqQueueValue] = useState('5');

  const [linkedBase, setLinkedBase] = useState<number[]>([]);
  const [seqBase, setSeqBase] = useState<number[]>([]);
  const [stackVals, setStackVals] = useState<number[]>([]);
  const [cqData, setCqData] = useState<(number | null)[]>(() => Array(CQ_MAX).fill(null));
  const [cqFront, setCqFront] = useState(0);
  const [cqRear, setCqRear] = useState(0);
  const [sqData, setSqData] = useState<(number | null)[]>(() => Array(SQ_MAX).fill(null));
  const [sqFront, setSqFront] = useState(0);
  const [sqRear, setSqRear] = useState(0);

  const [graphVertices, setGraphVertices] = useState<GraphVertex[]>([]);
  const [graphMatrix, setGraphMatrix] = useState<number[][]>([]);
  const [graphFrom, setGraphFrom] = useState('');
  const [graphTo, setGraphTo] = useState('');
  const [graphStart, setGraphStart] = useState('A');

  const [searchArray, setSearchArray] = useState<number[]>([1,2,3,4,5,6,7,8,9,10]);
  const [searchInput, setSearchInput] = useState('1,2,3,4,5,6,7,8,9,10');
  const [searchKey, setSearchKey] = useState('7');
  const [sortArray, setSortArray] = useState<number[]>([1,2,3,4,5,6,7,8,9,10]);
  const [sortInput, setSortInput] = useState('1,2,3,4,5,6,7,8,9,10');

  const [states, setStates] = useState<AnimationState[]>([]);
  const [operationType, setOperationType] = useState<OperationType>('headInsert');
  const mountedRef = useRef(false);
  const prevModuleRef = useRef<ModuleId>(activeModule);

  const [codeWidth, setCodeWidth] = useState(420);
  const [playbackHeight, setPlaybackHeight] = useState(132);

  const parsedInput = useMemo(() => parseValues(inputArray), [inputArray]);
  const parsedFind = useMemo(() => parseSingle(findTarget), [findTarget]);
  const parsedModIdx = useMemo(() => {
    const v = parseInt(modifyIndex.trim(), 10);
    return isNaN(v) || v < 1 ? null : v;
  }, [modifyIndex]);
  const parsedModVal = useMemo(() => parseSingle(modifyValue), [modifyValue]);
  const parsedStackVal = useMemo(() => parseSingle(stackValue), [stackValue]);
  const parsedQueueVal = useMemo(() => parseSingle(queueValue), [queueValue]);
  const parsedSqVal = useMemo(() => parseSingle(seqQueueValue), [seqQueueValue]);
  const parsedTreeTokens = useMemo(() => parseTreeTokens(inputArray), [inputArray]);

  const currentLength = (() => {
    if (isGraphEditModule(activeModule)) return graphVertices.length;
    if (isBinarySearchModule(activeModule)) return searchArray.length;
    if (isSortModule(activeModule)) return sortArray.length;
    switch (activeModule) {
      case '单链表': return linkedBase.length;
      case '顺序表': return seqBase.length;
      case '顺序栈': return stackVals.length;
      case '环形队列': return (cqRear - cqFront + CQ_MAX) % CQ_MAX;
      case '普通队列': return sqRear - sqFront;
      case '二叉树':
      case '二叉树的性质': return parsedTreeTokens.filter((token) => token !== null).length;
      default: return 0;
    }
  })();

  const initLabel = (() => {
    switch (activeModule) {
      case '单链表': return '头插法建表';
      case '顺序表': return '初始化顺序表';
      case '顺序栈': return '初始化栈';
      case '环形队列': return '初始化环形队列';
      case '普通队列': return '初始化队列';
      case '二叉树': return '递归建树';
      case '二叉树的性质': return '演示性质';
      case '存储结构-邻接矩阵':
      case '存储结构-邻接链表':
      case '广度优先搜索-BFS':
      case '深度优先搜索-DFS': return '图操作';
      case '折半查找': return '创建数列';
      case '直接插入排序':
      case '快速排序':
      case '堆排序': return '创建数组';
      default: return '初始化';
    }
  })();

  const startCodeResize = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = codeWidth;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent: MouseEvent) => {
      const maxWidth = Math.max(MIN_CODE_WIDTH, Math.min(MAX_CODE_WIDTH, Math.floor(window.innerWidth * 0.6)));
      setCodeWidth(clamp(startWidth - (moveEvent.clientX - startX), MIN_CODE_WIDTH, maxWidth));
    };
    const onUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [codeWidth]);

  const startPlaybackResize = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = playbackHeight;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent: MouseEvent) => {
      const maxHeight = Math.max(MIN_PLAYBACK_HEIGHT, Math.min(MAX_PLAYBACK_HEIGHT, Math.floor(window.innerHeight * 0.4)));
      setPlaybackHeight(clamp(startHeight - (moveEvent.clientY - startY), MIN_PLAYBACK_HEIGHT, maxHeight));
    };
    const onUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [playbackHeight]);

  const setGraphPreview = useCallback((vertices: GraphVertex[], matrix: number[][], description: string) => {
    setOperationType('graphMatrix');
    setStates([buildGraphPreviewState(vertices, matrix, description)]);
  }, []);

  const setGraphAdjListPreview = useCallback((vertices: GraphVertex[], matrix: number[][], description: string) => {
    setOperationType('graphAdjList');
    setStates([buildGraphAdjListPreviewState(vertices, matrix, description)]);
  }, []);

  const setGraphWarning = useCallback((description: string, type: OperationType = 'graphMatrix') => {
    setOperationType(type);
    setStates([{ ...buildGraphPreviewState(graphVertices, graphMatrix, description), isWarning: true }]);
  }, [graphMatrix, graphVertices]);

  const handleInit = useCallback(() => {
    if (isHuffmanModule(activeModule)) {
      setOperationType('document');
      setStates([]);
      return;
    }
    if (isGraphAdjListModule(activeModule)) {
      setGraphAdjListPreview(graphVertices, graphMatrix, graphVertices.length === 0 ? '点击画布创建顶点，最多 10 个。' : '当前图以邻接链表方式展示。');
      return;
    }
    if (isGraphDataModule(activeModule)) {
      setGraphPreview(graphVertices, graphMatrix, graphVertices.length === 0 ? '点击画布创建顶点，最多 10 个。' : '当前图以邻接矩阵方式展示。');
      return;
    }
    if (isBinarySearchModule(activeModule)) {
      setOperationType('binarySearch');
      setStates([buildBinarySearchPreviewState(searchArray)]);
      return;
    }
    if (isSortModule(activeModule)) {
      if (isInsertionSortModule(activeModule)) setOperationType('insertionSort');
      else if (isQuickSortModule(activeModule)) setOperationType('quickSort');
      else setOperationType('heapSort');
      setStates([buildSortPreviewState(sortArray)]);
      return;
    }

    const vals = parsedInput;
    const treeTokens = parsedTreeTokens.length > 0 ? parsedTreeTokens : parseTreeTokens(DEFAULT_BINARY_TREE_INPUT);
    if (vals.length === 0 && activeModule !== '二叉树' && activeModule !== '二叉树的性质') return;

    switch (activeModule) {
      case '单链表':
        setOperationType('headInsert');
        setStates(collectStates(generateHeadInsertStates(vals)));
        setLinkedBase([...vals].reverse());
        break;
      case '顺序表':
        setOperationType('seqInit');
        setStates(collectStates(generateSeqInit(vals)));
        setSeqBase([...vals]);
        break;
      case '顺序栈': {
        setOperationType('stackInit');
        const sv = vals.slice(0, 6);
        setStates(collectStates(generateStackInit(sv)));
        setStackVals([...sv]);
        break;
      }
      case '环形队列': {
        setOperationType('circularQueueInit');
        const cv = vals.slice(0, CQ_MAX);
        const cd = Array(CQ_MAX).fill(null) as (number | null)[];
        cv.forEach((v, i) => { cd[i] = v; });
        setStates(collectStates(generateCircularQueueInit(cv)));
        setCqData([...cd]);
        setCqFront(0);
        setCqRear(cv.length % CQ_MAX);
        break;
      }
      case '普通队列': {
        setOperationType('normalQueueInit');
        const nv = vals.slice(0, SQ_MAX);
        const nd = Array(SQ_MAX).fill(null) as (number | null)[];
        nv.forEach((v, i) => { nd[i] = v; });
        setStates(collectStates(generateNormalQueueInit(nv)));
        setSqData([...nd]);
        setSqFront(0);
        setSqRear(nv.length);
        break;
      }
      case '二叉树':
        setOperationType('binaryTreeBuild');
        setStates(collectStates(generateBinaryTreeBuildStates(treeTokens)));
        break;
      case '二叉树的性质':
        setOperationType('binaryTreeProperties');
        setStates(collectStates(generateBinaryTreePropertiesStates(treeTokens)));
        break;
    }
  }, [activeModule, graphMatrix, graphVertices, parsedInput, parsedTreeTokens, searchArray, setGraphAdjListPreview, setGraphPreview, sortArray]);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (prevModuleRef.current === activeModule) return;
    prevModuleRef.current = activeModule;
    const t = setTimeout(() => handleInit(), 0);
    return () => clearTimeout(t);
  }, [activeModule, handleInit]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevModuleRef.current = activeModule;
      const t = setTimeout(() => handleInit(), 0);
      return () => clearTimeout(t);
    }
  }, [activeModule, handleInit]);

  const handleTailInsert = useCallback(() => {
    if (parsedInput.length === 0) return;
    setOperationType('tailInsert');
    setStates(collectStates(generateTailInsertStates(parsedInput)));
    setLinkedBase([...parsedInput]);
  }, [parsedInput]);

  const handleFind = useCallback(() => {
    if (linkedBase.length === 0 || parsedFind === null) return;
    setOperationType('find');
    setStates(collectStates(generateFindStates(linkedBase, parsedFind)));
  }, [linkedBase, parsedFind]);

  const handleInsert = useCallback(() => {
    if (linkedBase.length === 0 || parsedModIdx === null || parsedModVal === null) return;
    if (parsedModIdx < 1 || parsedModIdx > linkedBase.length + 1) return;
    setOperationType('insert');
    setStates(collectStates(generateInsertStates(linkedBase, parsedModIdx, parsedModVal)));
    const nb = [...linkedBase];
    nb.splice(parsedModIdx - 1, 0, parsedModVal);
    setLinkedBase(nb);
  }, [linkedBase, parsedModIdx, parsedModVal]);

  const handleDelete = useCallback(() => {
    if (linkedBase.length === 0 || parsedModIdx === null) return;
    if (parsedModIdx < 1 || parsedModIdx > linkedBase.length) return;
    setOperationType('delete');
    setStates(collectStates(generateDeleteStates(linkedBase, parsedModIdx)));
    const nb = [...linkedBase];
    nb.splice(parsedModIdx - 1, 1);
    setLinkedBase(nb);
  }, [linkedBase, parsedModIdx]);

  const handleSeqInsert = useCallback(() => {
    if (seqBase.length === 0 || parsedModIdx === null || parsedModVal === null) return;
    if (parsedModIdx < 1 || parsedModIdx > seqBase.length + 1) return;
    setOperationType('seqInsert');
    setStates(collectStates(generateSeqInsert(seqBase, parsedModIdx, parsedModVal)));
    const nb = [...seqBase];
    nb.splice(parsedModIdx - 1, 0, parsedModVal);
    setSeqBase(nb);
  }, [seqBase, parsedModIdx, parsedModVal]);

  const handleSeqDelete = useCallback(() => {
    if (seqBase.length === 0 || parsedModIdx === null) return;
    if (parsedModIdx < 1 || parsedModIdx > seqBase.length) return;
    setOperationType('seqDelete');
    setStates(collectStates(generateSeqDelete(seqBase, parsedModIdx)));
    const nb = [...seqBase];
    nb.splice(parsedModIdx - 1, 1);
    setSeqBase(nb);
  }, [seqBase, parsedModIdx]);

  const handleSeqFind = useCallback(() => {
    if (seqBase.length === 0 || parsedFind === null) return;
    setOperationType('seqFind');
    setStates(collectStates(generateSeqFind(seqBase, parsedFind)));
  }, [seqBase, parsedFind]);

  const handleStackPush = useCallback(() => {
    if (parsedStackVal === null) return;
    setOperationType('stackPush');
    setStates(collectStates(generateStackPush(stackVals, parsedStackVal)));
    setStackVals((prev) => [...prev, parsedStackVal]);
  }, [stackVals, parsedStackVal]);

  const handleStackPop = useCallback(() => {
    setOperationType('stackPop');
    setStates(collectStates(generateStackPop(stackVals)));
    if (stackVals.length > 0) setStackVals((prev) => prev.slice(0, -1));
  }, [stackVals]);

  const handleCqEnqueue = useCallback(() => {
    if (parsedQueueVal === null) return;
    setOperationType('queueEnqueue');
    setStates(collectStates(generateQueueEnqueue(cqData, cqFront, cqRear, parsedQueueVal)));
    if ((cqRear + 1) % CQ_MAX === cqFront) return;
    setCqData((prev) => {
      const n = [...prev];
      n[cqRear] = parsedQueueVal;
      return n;
    });
    setCqRear((prev) => (prev + 1) % CQ_MAX);
  }, [cqData, cqFront, cqRear, parsedQueueVal]);

  const handleCqDequeue = useCallback(() => {
    setOperationType('queueDequeue');
    setStates(collectStates(generateQueueDequeue(cqData, cqFront, cqRear)));
    if (cqFront === cqRear) return;
    setCqData((prev) => {
      const n = [...prev];
      n[cqFront] = null;
      return n;
    });
    setCqFront((prev) => (prev + 1) % CQ_MAX);
  }, [cqData, cqFront, cqRear]);

  const handleSqEnqueue = useCallback(() => {
    if (parsedSqVal === null) return;
    setOperationType('seqQueueEnqueue');
    setStates(collectStates(generateSeqQueueEnqueue(sqData, sqFront, sqRear, parsedSqVal)));
    if (sqRear >= SQ_MAX) return;
    setSqData((prev) => {
      const n = [...prev];
      n[sqRear] = parsedSqVal;
      return n;
    });
    setSqRear((prev) => prev + 1);
  }, [sqData, sqFront, sqRear, parsedSqVal]);

  const handleSqDequeue = useCallback(() => {
    setOperationType('seqQueueDequeue');
    setStates(collectStates(generateSeqQueueDequeue(sqData, sqFront, sqRear)));
    if (sqFront === sqRear) return;
    setSqData((prev) => {
      const n = [...prev];
      n[sqFront] = null;
      return n;
    });
    setSqFront((prev) => prev + 1);
  }, [sqData, sqFront, sqRear]);

  const handleSqFind = useCallback(() => {
    if (parsedFind === null) return;
    setOperationType('seqQueueFind');
    setStates(collectStates(generateSeqQueueFind(sqData, sqFront, sqRear, parsedFind)));
  }, [sqData, sqFront, sqRear, parsedFind]);

  const handleTreePreorder = useCallback(() => {
    if (parsedTreeTokens.length === 0) return;
    setOperationType('binaryTreePreorder');
    setStates(collectStates(generateBinaryTreePreorderStates(parsedTreeTokens)));
  }, [parsedTreeTokens]);

  const handleTreeInorder = useCallback(() => {
    if (parsedTreeTokens.length === 0) return;
    setOperationType('binaryTreeInorder');
    setStates(collectStates(generateBinaryTreeInorderStates(parsedTreeTokens)));
  }, [parsedTreeTokens]);

  const handleTreePostorder = useCallback(() => {
    if (parsedTreeTokens.length === 0) return;
    setOperationType('binaryTreePostorder');
    setStates(collectStates(generateBinaryTreePostorderStates(parsedTreeTokens)));
  }, [parsedTreeTokens]);

  const handleGraphCanvasClick = useCallback((point: { x: number; y: number }) => {
    if (!isGraphEditModule(activeModule)) return;
    if (graphVertices.length >= GRAPH_MAX) {
      setGraphWarning('顶点数已达到 10 个，不能继续创建顶点。');
      return;
    }
    const tooClose = graphVertices.some((vertex) => Math.hypot(vertex.x + 28 - point.x, vertex.y + 28 - point.y) < 70);
    if (tooClose) {
      setGraphWarning('点击位置距离已有顶点太近，请换一个空白区域创建顶点。');
      return;
    }
    const label = GRAPH_LABELS[graphVertices.length];
    const newVertex: GraphVertex = { id: label, label, x: point.x - 28, y: point.y - 28 };
    const nextVertices = [...graphVertices, newVertex];
    const nextMatrix = graphMatrix.map((row) => [...row, 0]);
    nextMatrix.push(Array(nextVertices.length).fill(0));
    setGraphVertices(nextVertices);
    setGraphMatrix(nextMatrix);
    if (isGraphAdjListModule(activeModule)) {
      setGraphAdjListPreview(nextVertices, nextMatrix, `创建顶点 ${label}，邻接链表新增一个头结点。`);
    } else {
      setGraphPreview(nextVertices, nextMatrix, `创建顶点 ${label}，邻接矩阵扩容为 ${nextVertices.length} x ${nextVertices.length}。`);
    }
  }, [activeModule, graphMatrix, graphVertices, setGraphAdjListPreview, setGraphPreview, setGraphWarning]);

  const handleGraphAddEdge = useCallback(() => {
    const fromLabel = normalizeGraphLabel(graphFrom);
    const toLabel = normalizeGraphLabel(graphTo);
    const fromIndex = graphVertices.findIndex((vertex) => vertex.label === fromLabel);
    const toIndex = graphVertices.findIndex((vertex) => vertex.label === toLabel);
    if (fromIndex === -1 || toIndex === -1) {
      if (isGraphAdjListModule(activeModule)) {
        setOperationType('graphAdjList');
        setStates([buildGraphAdjListWarningState(graphVertices, graphMatrix, '添加边失败：起点或终点不存在。')]);
      } else {
        setGraphWarning('添加边失败：起点或终点不存在。');
      }
      return;
    }
    if (fromIndex === toIndex) {
      if (isGraphAdjListModule(activeModule)) {
        setOperationType('graphAdjList');
        setStates([buildGraphAdjListWarningState(graphVertices, graphMatrix, '添加边失败：无向图不允许添加自环。')]);
      } else {
        setGraphWarning('添加边失败：无向图不允许添加自环。');
      }
      return;
    }
    if (graphMatrix[fromIndex]?.[toIndex] === 1) {
      if (isGraphAdjListModule(activeModule)) {
        setOperationType('graphAdjList');
        setStates([buildGraphAdjListWarningState(graphVertices, graphMatrix, `边 ${fromLabel}-${toLabel} 已存在，不会重复创建边表结点。`)]);
      } else {
        setGraphWarning(`边 ${fromLabel}-${toLabel} 已存在，不会重复创建。`);
      }
      return;
    }
    const nextMatrix = graphMatrix.map((row) => [...row]);
    nextMatrix[fromIndex][toIndex] = 1;
    nextMatrix[toIndex][fromIndex] = 1;
    setGraphMatrix(nextMatrix);
    if (isGraphAdjListModule(activeModule)) {
      setOperationType('graphAdjList');
      setStates(generateGraphAdjListAddEdgeStates(graphVertices, nextMatrix, fromIndex, toIndex));
    } else {
      setOperationType('graphAddEdge');
      setStates([generateGraphAddEdgeState(graphVertices, nextMatrix, fromIndex, toIndex)]);
    }
  }, [activeModule, graphFrom, graphMatrix, graphTo, graphVertices, setGraphWarning]);

  const handleGraphClear = useCallback(() => {
    setGraphVertices([]);
    setGraphMatrix([]);
    if (isGraphAdjListModule(activeModule)) {
      setGraphAdjListPreview([], [], '图已清空。点击画布创建顶点，最多 10 个。');
    } else {
      setGraphPreview([], [], '图已清空。点击画布创建顶点，最多 10 个。');
    }
  }, [activeModule, setGraphAdjListPreview, setGraphPreview]);

  const handleGraphVertexMove = useCallback((vertexId: string, point: { x: number; y: number }) => {
    if (!isGraphEditModule(activeModule)) return;
    const nextVertices = graphVertices.map((vertex) => (
      vertex.id === vertexId
        ? { ...vertex, x: point.x, y: point.y }
        : vertex
    ));
    setGraphVertices(nextVertices);
    if (isGraphAdjListModule(activeModule)) {
      setGraphAdjListPreview(nextVertices, graphMatrix, `顶点 ${vertexId} 已移动，邻接链表关系保持不变。`);
    } else {
      setGraphPreview(nextVertices, graphMatrix, `顶点 ${vertexId} 已移动，图的边和邻接矩阵关系保持不变。`);
    }
  }, [activeModule, graphMatrix, graphVertices, setGraphAdjListPreview, setGraphPreview]);

  const handleGraphBfs = useCallback(() => {
    if (graphVertices.length === 0) {
      setGraphWarning('请先点击画布创建顶点，再开始 BFS。', 'graphBfs');
      return;
    }
    const startIndex = graphVertices.findIndex((vertex) => vertex.label === normalizeGraphLabel(graphStart));
    if (startIndex === -1) {
      setGraphWarning('BFS 起点不存在，请输入已有顶点标签。', 'graphBfs');
      return;
    }
    setOperationType('graphBfs');
    setStates(collectStates(generateGraphBfsStates(graphVertices, graphMatrix, startIndex)));
  }, [graphMatrix, graphStart, graphVertices, setGraphWarning]);

  const handleGraphDfs = useCallback(() => {
    if (graphVertices.length === 0) {
      setGraphWarning('请先点击画布创建顶点，再开始 DFS。', 'graphDfs');
      return;
    }
    const startIndex = graphVertices.findIndex((vertex) => vertex.label === normalizeGraphLabel(graphStart));
    if (startIndex === -1) {
      setGraphWarning('DFS 起点不存在，请输入已有顶点标签。', 'graphDfs');
      return;
    }
    setOperationType('graphDfs');
    setStates(collectStates(generateGraphDfsStates(graphVertices, graphMatrix, startIndex)));
  }, [graphMatrix, graphStart, graphVertices, setGraphWarning]);

  const handleCreateSearchArray = useCallback(() => {
    const parsed = parseNumberListStrict(searchInput);
    if (parsed.error) {
      setOperationType('binarySearch');
      setStates([buildBinarySearchWarningState(searchArray, parsed.error)]);
      return;
    }
    const sorted = [...parsed.values].sort((a, b) => a - b);
    setSearchArray(sorted);
    setSearchInput(sorted.join(','));
    setOperationType('binarySearch');
    setStates([buildBinarySearchPreviewState(sorted, '折半查找要求顺序表有序，已自动按升序排列。')]);
  }, [searchArray, searchInput]);

  const handleResetSearchArray = useCallback(() => {
    const base = [1,2,3,4,5,6,7,8,9,10];
    setSearchArray(base);
    setSearchInput(base.join(','));
    setOperationType('binarySearch');
    setStates([buildBinarySearchPreviewState(base)]);
  }, []);

  const handleBinarySearch = useCallback(() => {
    const key = Number(searchKey.trim());
    if (Number.isNaN(key)) {
      setOperationType('binarySearch');
      setStates([buildBinarySearchWarningState(searchArray, '折半查找 key 不是数字。')]);
      return;
    }
    setOperationType('binarySearch');
    setStates(generateBinarySearchStates(searchArray, key));
  }, [searchArray, searchKey]);

  const handleCreateSortArray = useCallback(() => {
    const parsed = parseNumberListStrict(sortInput);
    if (parsed.error) {
      setOperationType('createSortArray');
      setStates([buildSortWarningState(sortArray, parsed.error)]);
      return;
    }
    setSortArray(parsed.values);
    setSortInput(parsed.values.join(','));
    setOperationType('createSortArray');
    setStates([buildSortPreviewState(parsed.values, '排序数组创建完成，点击开始排序生成逐行动画。')]);
  }, [sortArray, sortInput]);

  const handleShuffleSortArray = useCallback(() => {
    const source = sortArray.length > 0 ? [...sortArray] : [1,2,3,4,5,6,7,8,9,10];
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    setSortArray(source);
    setSortInput(source.join(','));
    setOperationType('shuffleSortArray');
    setStates([buildSortPreviewState(source, '数组已随机打乱，未开始排序。')]);
  }, [sortArray]);

  const handleResetSortArray = useCallback(() => {
    const base = [1,2,3,4,5,6,7,8,9,10];
    setSortArray(base);
    setSortInput(base.join(','));
    setOperationType('createSortArray');
    setStates([buildSortPreviewState(base, '数组已重置为 1-10。')]);
  }, []);

  const handleStartSort = useCallback(() => {
    if (isInsertionSortModule(activeModule)) {
      setOperationType('insertionSort');
      setStates(generateInsertionSortStates(sortArray));
    } else if (isQuickSortModule(activeModule)) {
      setOperationType('quickSort');
      setStates(generateQuickSortStates(sortArray));
    } else if (isHeapSortModule(activeModule)) {
      setOperationType('heapSort');
      setStates(generateHeapSortStates(sortArray));
    }
  }, [activeModule, sortArray]);

  const handleFindU = useCallback(() => {
    if (isBinarySearchModule(activeModule)) handleBinarySearch();
    if (activeModule === '单链表') handleFind();
    else if (activeModule === '顺序表') handleSeqFind();
  }, [activeModule, handleBinarySearch, handleFind, handleSeqFind]);

  const handleInsertU = useCallback(() => {
    if (activeModule === '单链表') handleInsert();
    else if (activeModule === '顺序表') handleSeqInsert();
  }, [activeModule, handleInsert, handleSeqInsert]);

  const handleDeleteU = useCallback(() => {
    if (activeModule === '单链表') handleDelete();
    else if (activeModule === '顺序表') handleSeqDelete();
  }, [activeModule, handleDelete, handleSeqDelete]);

  const handleModuleChange = useCallback((moduleId: ModuleId) => {
    if ((moduleId === '二叉树' || moduleId === '二叉树的性质') && !inputArray.includes('#')) {
      setInputArray(DEFAULT_BINARY_TREE_INPUT);
    }
    if (isBinarySearchModule(moduleId)) {
      const base = [1,2,3,4,5,6,7,8,9,10];
      setSearchArray(base);
      setSearchInput(base.join(','));
    }
    if (isSortModule(moduleId)) {
      const base = [1,2,3,4,5,6,7,8,9,10];
      setSortArray(base);
      setSortInput(base.join(','));
    }
    setActiveModule(moduleId);
  }, [inputArray]);

  const {
    currentState, currentIndex, totalFrames, isPlaying, playSpeed,
    togglePlay, stepForward, stepBack, jumpTo, reset, setSpeed,
  } = useAnimationPlayer({ states, initialSpeed: 1000, autoPlay: false, initialIndex: -1 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBack();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, stepForward, stepBack]);

  const codeString = CODE_MAP[operationType];
  const currentCodeLine = currentState?.codeLine ?? 0;
  const showGraphPanel = isGraphDataModule(activeModule);
  const showGraphAdjListPanel = isGraphAdjListModule(activeModule);
  const matrixVertices = currentState?.graphVertices ?? graphVertices;
  const matrixData = currentState?.graphMatrix ?? graphMatrix;
  const matrixHighlights = currentState?.matrixHighlights ?? [];
  const adjacencyList = currentState?.adjacencyList;
  const documentContent = DOCUMENT_MAP[activeModule];
  const showDocumentPanel = isDocumentModule(activeModule) && Boolean(documentContent);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-pink-50 via-white to-rose-50 font-sans text-slate-800">
      <div className="pointer-events-none absolute -top-28 left-1/4 h-72 w-72 rounded-full bg-pink-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-rose-200/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(244,114,182,0.12) 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 shrink-0 min-w-0 w-64">
        <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-w-0 p-4 gap-3">
        <div className="h-16 rounded-2xl border border-pink-200/80 bg-white/80 backdrop-blur-xl flex items-center px-6 shadow-lg shadow-pink-100/70 justify-between z-10">
          <h1 className="text-xl font-extrabold tracking-wide text-slate-800">
            {activeModule}{' '}
            <span className="text-xs font-bold ml-2 px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full border border-pink-200 shadow-sm shadow-pink-100">必考核心</span>
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="text-xs font-mono text-pink-500 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full">{operationType}</span>
            <span className="hidden lg:inline">Powered by Sakura State Machine Engine</span>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden rounded-3xl border border-pink-200/80 bg-white/55 backdrop-blur-xl shadow-xl shadow-pink-100/70">
          {isHuffmanModule(activeModule) ? (
            <div className="flex-1 relative bg-gradient-to-br from-white via-pink-50/60 to-rose-50 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-70 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(244,114,182,0.14) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10 max-w-lg rounded-3xl border border-pink-200 bg-white/85 backdrop-blur-xl p-7 shadow-xl shadow-pink-100">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500 mb-2">理论阅读模块</p>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-3">哈夫曼树</h2>
                <p className="text-sm leading-7 text-slate-600">
                  本模块不生成算法动画。右侧文档区说明哈夫曼树的概念、构造步骤、示例和编码特点。
                </p>
              </div>
            </div>
          ) : (
            <MemoryCanvas
              currentState={currentState}
              module={activeModule}
              isGraphEditMode={isGraphEditModule(activeModule)}
              onGraphCanvasClick={handleGraphCanvasClick}
              onGraphVertexMove={handleGraphVertexMove}
              isGraphVertexDragDisabled={isPlaying}
            />
          )}
          <div
            data-no-drag
            className="w-3 cursor-col-resize bg-pink-100/80 hover:bg-pink-300 active:bg-rose-300 transition-colors z-30 shrink-0"
            title="拖动调整代码面板宽度"
            onMouseDown={startCodeResize}
          />
          <div className="shrink-0 h-full min-w-0" style={{ width: codeWidth }}>
            {showDocumentPanel && documentContent ? (
              <DocumentPanel
                title={documentContent.title}
                subtitle={documentContent.subtitle}
                sections={documentContent.sections}
              />
            ) : showGraphPanel ? (
              <div className="h-full flex flex-col min-h-0">
                <div className="h-[38%] min-h-[170px]">
                  <GraphMatrixPanel vertices={matrixVertices} matrix={matrixData} activeCells={matrixHighlights} />
                </div>
                <div className="flex-1 min-h-0">
                  <CodePanel codeLine={currentCodeLine} codeString={codeString} />
                </div>
              </div>
            ) : showGraphAdjListPanel ? (
              <div className="h-full flex flex-col min-h-0">
                <div className="h-[38%] min-h-[170px]">
                  <GraphAdjListPanel vertices={matrixVertices} adjacencyList={adjacencyList} />
                </div>
                <div className="flex-1 min-h-0">
                  <CodePanel codeLine={currentCodeLine} codeString={codeString} />
                </div>
              </div>
            ) : (
              <CodePanel codeLine={currentCodeLine} codeString={codeString} />
            )}
          </div>
        </div>

        <div
          data-no-drag
          className="h-3 cursor-row-resize rounded-full bg-pink-100/80 hover:bg-pink-300 active:bg-rose-300 transition-colors z-30 shrink-0"
          title="拖动调整底部控制栏高度"
          onMouseDown={startPlaybackResize}
        />
        <div className="shrink-0 min-h-0" style={{ height: playbackHeight }}>
          <PlaybackBar
            module={activeModule}
            inputArray={inputArray} onInputArrayChange={setInputArray}
            onInit={handleInit} initLabel={initLabel}
            onTailInsert={handleTailInsert}
            stackValue={stackValue} onStackValueChange={setStackValue}
            onStackPush={handleStackPush} onStackPop={handleStackPop}
            queueValue={queueValue} onQueueValueChange={setQueueValue}
            onQueueEnqueue={handleCqEnqueue} onQueueDequeue={handleCqDequeue}
            seqQueueValue={seqQueueValue} onSeqQueueValueChange={setSeqQueueValue}
            onSeqQueueEnqueue={handleSqEnqueue} onSeqQueueDequeue={handleSqDequeue}
            onSeqQueueFind={handleSqFind}
            onTreePreorder={handleTreePreorder} onTreeInorder={handleTreeInorder}
            onTreePostorder={handleTreePostorder}
            findTarget={findTarget} onFindTargetChange={setFindTarget} onFind={handleFindU}
            modifyIndex={modifyIndex} onModifyIndexChange={setModifyIndex}
            modifyValue={modifyValue} onModifyValueChange={setModifyValue}
            onInsert={handleInsertU} onDelete={handleDeleteU}
            isPlaying={isPlaying} currentIndex={currentIndex} totalFrames={totalFrames} playSpeed={playSpeed}
            onTogglePlay={togglePlay} onStepForward={stepForward} onStepBack={stepBack}
            onReset={reset} onJumpToEnd={() => jumpTo(Math.max(0, totalFrames - 1))}
            onJumpTo={jumpTo} onSpeedChange={(s: PlaySpeed) => setSpeed(s)}
            listLength={currentLength}
            graphFrom={graphFrom} onGraphFromChange={setGraphFrom}
            graphTo={graphTo} onGraphToChange={setGraphTo}
            graphStart={graphStart} onGraphStartChange={setGraphStart}
            onGraphAddEdge={handleGraphAddEdge}
            onGraphClear={handleGraphClear}
            onGraphBfs={handleGraphBfs}
            onGraphDfs={handleGraphDfs}
            graphVertexCount={graphVertices.length}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            searchKey={searchKey}
            onSearchKeyChange={setSearchKey}
            onCreateSearchArray={handleCreateSearchArray}
            onBinarySearch={handleBinarySearch}
            onResetSearchArray={handleResetSearchArray}
            sortInput={sortInput}
            onSortInputChange={setSortInput}
            onCreateSortArray={handleCreateSortArray}
            onShuffleSortArray={handleShuffleSortArray}
            onResetSortArray={handleResetSortArray}
            onStartSort={handleStartSort}
          />
        </div>
      </div>
    </div>
  );
}
