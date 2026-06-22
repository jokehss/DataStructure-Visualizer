// ============================================================
// src/components/ControlPanel/PlaybackBar.tsx — V5
// 线性表 / 顺序表 / 栈 / 队列 / 二叉树 条件渲染操作区
// ============================================================

import {
  Play, Pause, StepForward, StepBack, SkipForward, SkipBack,
  Plus, Search, Trash2, List,
  ArrowDown, ArrowUp, ChevronRight, ChevronLeft,
} from 'lucide-react';
import type { PlaySpeed, ModuleId } from '@/types';
import { PLAY_SPEEDS, PLAY_SPEED_LABELS } from '@/types';

// ---- Props ----

export interface PlaybackBarProps {
  module: ModuleId;

  // 建表区（所有模块通用）
  inputArray: string;
  onInputArrayChange: (value: string) => void;
  onInit: () => void;           // 统一初始化入口
  initLabel: string;            // 按钮文案，如 "头插法建表"

  // 单链表额外建表选项
  onTailInsert?: () => void;

  // 栈
  stackValue: string;
  onStackValueChange: (v: string) => void;
  onStackPush?: () => void;
  onStackPop?: () => void;

  // 环形队列
  queueValue: string;
  onQueueValueChange: (v: string) => void;
  onQueueEnqueue?: () => void;
  onQueueDequeue?: () => void;

  // 普通队列
  seqQueueValue: string;
  onSeqQueueValueChange: (v: string) => void;
  onSeqQueueEnqueue?: () => void;
  onSeqQueueDequeue?: () => void;
  onSeqQueueFind?: () => void;

  // 二叉树
  onTreePreorder?: () => void;
  onTreeInorder?: () => void;
  onTreePostorder?: () => void;

  // 查询
  findTarget: string;
  onFindTargetChange: (value: string) => void;
  onFind: () => void;

  // 修改
  modifyIndex: string;
  onModifyIndexChange: (value: string) => void;
  modifyValue: string;
  onModifyValueChange: (value: string) => void;
  onInsert: () => void;
  onDelete: () => void;

  // 播放状态
  isPlaying: boolean;
  currentIndex: number;
  totalFrames: number;
  playSpeed: PlaySpeed;

  // 播放控制
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onJumpToEnd: () => void;
  onJumpTo: (index: number) => void;
  onSpeedChange: (speed: PlaySpeed) => void;

  listLength: number;

  graphFrom?: string;
  onGraphFromChange?: (value: string) => void;
  graphTo?: string;
  onGraphToChange?: (value: string) => void;
  graphStart?: string;
  onGraphStartChange?: (value: string) => void;
  onGraphAddEdge?: () => void;
  onGraphClear?: () => void;
  onGraphBfs?: () => void;
  onGraphDfs?: () => void;
  graphVertexCount?: number;

  searchInput?: string;
  onSearchInputChange?: (value: string) => void;
  searchKey?: string;
  onSearchKeyChange?: (value: string) => void;
  onCreateSearchArray?: () => void;
  onBinarySearch?: () => void;
  onResetSearchArray?: () => void;

  sortInput?: string;
  onSortInputChange?: (value: string) => void;
  onCreateSortArray?: () => void;
  onShuffleSortArray?: () => void;
  onResetSortArray?: () => void;
  onStartSort?: () => void;
}

// ---- 小组件 ----

function TinyInput({ value, onChange, placeholder, className = '', onEnter }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; className?: string; onEnter?: () => void;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      placeholder={placeholder}
      className={`border border-slate-300 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none ${className}`} />
  );
}

function OpButton({ onClick, children, variant = 'default', className = '', title }: {
  onClick: () => void; children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger'; className?: string; title?: string;
}) {
  const base = 'px-3 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 shrink-0';
  const v: Record<string, string> = {
    default: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm',
    danger: 'bg-white hover:bg-red-50 text-red-600 border-red-300 hover:border-red-400',
  };
  return <button onClick={onClick} className={`${base} ${v[variant]} ${className}`} title={title}>{children}</button>;
}

function Sep() { return <div className="w-px h-8 bg-slate-200 shrink-0" />; }
function GroupLabel({ text }: { text: string }) {
  return <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{text}</span>;
}

// ---- 组件 ----

export function PlaybackBar({
  module,
  inputArray, onInputArrayChange, onInit, initLabel,
  onTailInsert,
  stackValue, onStackValueChange, onStackPush, onStackPop,
  queueValue, onQueueValueChange, onQueueEnqueue, onQueueDequeue,
  seqQueueValue, onSeqQueueValueChange, onSeqQueueEnqueue, onSeqQueueDequeue, onSeqQueueFind,
  onTreePreorder, onTreeInorder, onTreePostorder,
  findTarget, onFindTargetChange, onFind,
  modifyIndex, onModifyIndexChange, modifyValue, onModifyValueChange,
  onInsert, onDelete,
  isPlaying, currentIndex, totalFrames, playSpeed,
  onTogglePlay, onStepForward, onStepBack, onReset, onJumpToEnd, onJumpTo, onSpeedChange,
  listLength,
  graphFrom = '', onGraphFromChange,
  graphTo = '', onGraphToChange,
  graphStart = 'A', onGraphStartChange,
  onGraphAddEdge, onGraphClear, onGraphBfs, onGraphDfs,
  graphVertexCount = 0,
  searchInput = '', onSearchInputChange,
  searchKey = '7', onSearchKeyChange,
  onCreateSearchArray, onBinarySearch, onResetSearchArray,
  sortInput = '', onSortInputChange,
  onCreateSortArray, onShuffleSortArray, onResetSortArray, onStartSort,
}: PlaybackBarProps) {
  const maxSlider = totalFrames > 0 ? totalFrames - 1 : 0;
  const isLinkedList = module === '单链表';
  const isSeqList = module === '顺序表';
  const isStack = module === '顺序栈';
  const isQueue = module === '环形队列';
  const isSeqQueue = module === '普通队列';
  const isBinaryTree = module === '二叉树';
  const isBinaryTreeProperties = module === '二叉树的性质';
  const isTreeModule = isBinaryTree || isBinaryTreeProperties;
  const isLinOrSeq = isLinkedList || isSeqList;
  const isGraphMatrix = module === '存储结构-邻接矩阵';
  const isGraphListPlaceholder = module === '存储结构-邻接链表';
  const isGraphBfs = module === '广度优先搜索-BFS';
  const isGraphDfs = module === '深度优先搜索-DFS';
  const isGraphModule = isGraphMatrix || isGraphListPlaceholder || isGraphBfs || isGraphDfs;
  const isBinarySearch = module === '折半查找';
  const isInsertionSort = module === '直接插入排序';
  const isQuickSort = module === '快速排序';
  const isHeapSort = module === '堆排序';
  const isSortModule = isInsertionSort || isQuickSort || isHeapSort;
  const inputPlaceholder = isTreeModule ? '前序: 1,2,#,#,3,#,#' : 'e.g. 10,20,30';

  return (
    <div className="h-full overflow-y-auto bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-20 custom-scrollbar">
      {/* ---- 第 0 行：算法操作区 ---- */}
      <div className="px-6 py-2.5 flex items-center gap-6 border-b border-slate-100 flex-wrap">

        {!isGraphModule && !isBinarySearch && !isSortModule && (
          <div className="flex items-center gap-2">
            <GroupLabel text="建表" />
            <TinyInput value={inputArray} onChange={onInputArrayChange}
              placeholder={inputPlaceholder} className={isTreeModule ? 'w-48' : 'w-28'}
              onEnter={onInit} />
            <OpButton onClick={onInit} variant="primary"><List size={13} />{initLabel}</OpButton>
            {isLinkedList && (<>
              <OpButton onClick={onTailInsert!} variant="primary"><Plus size={13} />尾插法</OpButton>
            </>)}
          </div>
        )}

        {(isGraphMatrix || isGraphListPlaceholder || isGraphBfs || isGraphDfs) && (
          <div className="flex items-center gap-2 flex-wrap">
            <GroupLabel text="图操作" />
            <span className="text-xs text-slate-500">点击画布创建顶点，最多 10 个</span>
            <span className="text-xs font-mono text-slate-500">{graphVertexCount} / 10</span>
            <TinyInput value={graphFrom} onChange={onGraphFromChange!} placeholder="起点 A" className="w-18" onEnter={onGraphAddEdge} />
            <TinyInput value={graphTo} onChange={onGraphToChange!} placeholder="终点 B" className="w-18" onEnter={onGraphAddEdge} />
            <OpButton onClick={onGraphAddEdge!} variant="primary"><Plus size={13} />添加边</OpButton>
            <OpButton onClick={onGraphClear!} variant="danger"><Trash2 size={13} />清空图</OpButton>
            {(isGraphBfs || isGraphDfs) && (
              <>
                <Sep />
                <GroupLabel text="遍历" />
                <TinyInput value={graphStart} onChange={onGraphStartChange!} placeholder="起点 A" className="w-18" onEnter={isGraphBfs ? onGraphBfs : onGraphDfs} />
                {isGraphBfs && <OpButton onClick={onGraphBfs!} variant="primary"><Search size={13} />开始 BFS</OpButton>}
                {isGraphDfs && <OpButton onClick={onGraphDfs!} variant="primary"><Search size={13} />开始 DFS</OpButton>}
              </>
            )}
          </div>
        )}

        {isBinarySearch && (
          <div className="flex items-center gap-2 flex-wrap">
            <GroupLabel text="折半查找" />
            <TinyInput value={searchInput} onChange={onSearchInputChange!} placeholder="1,2,3,4,5" className="w-44" onEnter={onCreateSearchArray} />
            <OpButton onClick={onCreateSearchArray!} variant="primary"><List size={13} />创建数列</OpButton>
            <TinyInput value={searchKey} onChange={onSearchKeyChange!} placeholder="key" className="w-16" onEnter={onBinarySearch} />
            <OpButton onClick={onBinarySearch!} variant="primary"><Search size={13} />开始查找</OpButton>
            <OpButton onClick={onResetSearchArray!}>重置为 1-10</OpButton>
          </div>
        )}

        {isSortModule && (
          <div className="flex items-center gap-2 flex-wrap">
            <GroupLabel text="排序" />
            <TinyInput value={sortInput} onChange={onSortInputChange!} placeholder="8,3,5,1,9" className="w-44" onEnter={onCreateSortArray} />
            <OpButton onClick={onCreateSortArray!} variant="primary"><List size={13} />创建数列</OpButton>
            <OpButton onClick={onShuffleSortArray!}><ArrowDown size={13} />随机打乱</OpButton>
            <OpButton onClick={onResetSortArray!}>重置为 1-10</OpButton>
            <OpButton onClick={onStartSort!} variant="primary"><ChevronRight size={13} />开始排序</OpButton>
          </div>
        )}

        {/* ====== 二叉树：递归遍历区 ====== */}
        {isBinaryTree && (<>
          <Sep />
          <div className="flex items-center gap-2">
            <GroupLabel text="遍历" />
            <OpButton onClick={onTreePreorder!} variant="primary"><ChevronRight size={13} />先序</OpButton>
            <OpButton onClick={onTreeInorder!}><List size={13} />中序</OpButton>
            <OpButton onClick={onTreePostorder!}><ChevronLeft size={13} />后序</OpButton>
            <span className="text-[10px] text-slate-400 ml-1">结点数: {listLength}</span>
          </div>
        </>)}

        {isBinaryTreeProperties && (
          <span className="text-[10px] text-slate-400 -ml-4">结点数: {listLength}</span>
        )}

        {/* ====== 链表/顺序表：查询区 ====== */}
        {isLinOrSeq && (
          <div className="flex items-center gap-2">
            <GroupLabel text="查询" />
            <TinyInput value={findTarget} onChange={onFindTargetChange}
              placeholder="目标值" className="w-20" onEnter={onFind} />
            <OpButton onClick={onFind}><Search size={13} />按值查找</OpButton>
          </div>
        )}

        {isLinOrSeq && <Sep />}

        {/* ====== 链表/顺序表：修改区 ====== */}
        {isLinOrSeq && (
          <div className="flex items-center gap-2">
            <GroupLabel text="修改" />
            <TinyInput value={modifyIndex} onChange={onModifyIndexChange}
              placeholder="位序i" className="w-16" onEnter={onInsert} />
            <TinyInput value={modifyValue} onChange={onModifyValueChange}
              placeholder="数据e" className="w-16" onEnter={onInsert} />
            <OpButton onClick={onInsert} variant="primary"><Plus size={13} />插入</OpButton>
            <OpButton onClick={onDelete} variant="danger"><Trash2 size={13} />删除</OpButton>
            <span className="text-[10px] text-slate-400 ml-1">({isLinkedList ? '表长' : 'length'}: {listLength})</span>
          </div>
        )}

        {/* ====== 栈：Push/Pop 修改区 ====== */}
        {isStack && (<>
          <Sep />
          <div className="flex items-center gap-2">
            <GroupLabel text="修改" />
            <TinyInput value={stackValue} onChange={onStackValueChange}
              placeholder="数据" className="w-18" onEnter={onStackPush} />
            <OpButton onClick={onStackPush!} variant="primary"><ArrowDown size={13} />Push</OpButton>
            <OpButton onClick={onStackPop!} variant="danger"><ArrowUp size={13} />Pop</OpButton>
            <span className="text-[10px] text-slate-400 ml-1">top: {listLength}</span>
          </div>
        </>)}

        {/* ====== 环形队列：Enqueue/Dequeue 修改区 ====== */}
        {isQueue && (<>
          <Sep />
          <div className="flex items-center gap-2">
            <GroupLabel text="修改" />
            <TinyInput value={queueValue} onChange={onQueueValueChange}
              placeholder="数据" className="w-18" onEnter={onQueueEnqueue} />
            <OpButton onClick={onQueueEnqueue!} variant="primary"><ChevronRight size={13} />Enqueue</OpButton>
            <OpButton onClick={onQueueDequeue!} variant="danger"><ChevronLeft size={13} />Dequeue</OpButton>
            <span className="text-[10px] text-slate-400 ml-1">len: {listLength}</span>
          </div>
        </>)}

        {/* ====== 普通队列：Enqueue/Dequeue/Find 修改区 ====== */}
        {isSeqQueue && (<>
          <Sep />
          <div className="flex items-center gap-2">
            <GroupLabel text="修改" />
            <TinyInput value={seqQueueValue} onChange={onSeqQueueValueChange}
              placeholder="数据" className="w-18" onEnter={onSeqQueueEnqueue} />
            <OpButton onClick={onSeqQueueEnqueue!} variant="primary"><ChevronRight size={13} />进队</OpButton>
            <OpButton onClick={onSeqQueueDequeue!} variant="danger"><ChevronLeft size={13} />出队</OpButton>
            <OpButton onClick={onSeqQueueFind!}><Search size={13} />查找</OpButton>
            <span className="text-[10px] text-slate-400 ml-1">len: {listLength}</span>
          </div>
        </>)}
      </div>

      {/* ---- 第 1 行：播放控制台 ---- */}
      <div className="h-14 px-6 flex items-center justify-between">
        <div className="w-48"><span className="text-[9px] text-slate-400 uppercase tracking-wide">动画播放控制</span></div>

        <div className="flex items-center gap-6 flex-1 max-w-xl">
          <div className="flex items-center gap-1.5">
            <button onClick={onReset} disabled={totalFrames === 0} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="跳转到开头"><SkipBack size={18} /></button>
            <button onClick={onStepBack} disabled={totalFrames === 0} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="后退一帧"><StepBack size={18} /></button>
            <button onClick={onTogglePlay} disabled={totalFrames === 0} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed" title={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={onStepForward} disabled={totalFrames === 0} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="前进一帧"><StepForward size={18} /></button>
            <button onClick={onJumpToEnd} disabled={totalFrames === 0} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="跳转到末尾"><SkipForward size={18} /></button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-500 w-12 text-right">{totalFrames > 0 ? `${currentIndex + 1}/${totalFrames}` : '--'}</span>
            <input type="range" min={0} max={maxSlider} value={currentIndex} onChange={(e) => onJumpTo(Number(e.target.value))} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-48 justify-end">
          <span className="text-xs font-medium text-slate-400">速度</span>
          <select value={playSpeed} onChange={(e) => onSpeedChange(Number(e.target.value) as PlaySpeed)} className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            {PLAY_SPEEDS.map((speed) => (<option key={speed} value={speed}>{PLAY_SPEED_LABELS[speed]}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
}
