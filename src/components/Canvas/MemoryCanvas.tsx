// ============================================================
// src/components/Canvas/MemoryCanvas.tsx — V6
// SVG 扇形饼图 (环形队列) + 顺序队列橙色激活 + 极简游标
// ============================================================

import { useState, useCallback, useRef, type WheelEvent, type MouseEvent } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { AnimationState, ModuleId, Node, Pointer } from '@/types';

// ======================== Props ========================

export interface MemoryCanvasProps {
  currentState: AnimationState | null;
  module?: ModuleId;
  isGraphEditMode?: boolean;
  onGraphCanvasClick?: (point: { x: number; y: number }) => void;
}

// ======================== 工具 ========================

interface Vec2 { x: number; y: number }

function getLineCoords(fromId: string, toId: string, nodes: Node[], label?: string) {
  const fromNode = nodes.find((n) => n.id === fromId);
  if (!fromNode) return null;

  const getNodeSize = (node: Node) => ({
    width: node.type === 'tree' ? 84 : node.type === 'array' || node.type === 'stack' || node.type === 'graph' ? 56 : 64,
    height: node.type === 'tree' ? 52 : node.type === 'graph' ? 56 : 48,
  });

  const getBox = (node: Node) => {
    const { width, height } = getNodeSize(node);
    return {
      left: node.x,
      right: node.x + width,
      top: node.y,
      bottom: node.y + height,
      cx: node.x + width / 2,
      cy: node.y + height / 2,
      halfW: width / 2,
      halfH: height / 2,
    };
  };

  const getSmartAnchor = (node: Node, target: Node, role: 'source' | 'target') => {
    const box = getBox(node);
    const targetBox = getBox(target);
    const dx = targetBox.cx - box.cx;
    const dy = targetBox.cy - box.cy;

    if (node.type === 'graph') {
      const len = Math.max(1, Math.hypot(dx, dy));
      const radius = 28;
      return {
        x: box.cx + (dx / len) * radius,
        y: box.cy + (dy / len) * radius,
      };
    }

    if (node.type === 'tree' && role === 'source' && dy > 0) {
      return label === 'lchild'
        ? { x: box.left + 17, y: box.bottom }
        : { x: box.right - 17, y: box.bottom };
    }

    if (node.type === 'tree' && role === 'target' && dy < 0) {
      return { x: box.cx, y: box.top };
    }

    if (Math.abs(dy) <= 12) {
      return role === 'source'
        ? { x: box.right, y: box.cy }
        : { x: box.left, y: box.cy };
    }

    if (role === 'source' && dx >= 0 && Math.abs(dx) >= Math.abs(dy) * 0.45) {
      return {
        x: box.right,
        y: Math.min(box.bottom - 8, Math.max(box.top + 8, box.cy + dy * 0.18)),
      };
    }

    if (role === 'target' && dx <= 0 && Math.abs(dx) >= Math.abs(dy) * 0.45) {
      return {
        x: box.left,
        y: Math.min(box.bottom - 8, Math.max(box.top + 8, box.cy + dy * 0.18)),
      };
    }

    const safeDx = dx === 0 ? 0.0001 : dx;
    const safeDy = dy === 0 ? 0.0001 : dy;
    const scale = Math.min(box.halfW / Math.abs(safeDx), box.halfH / Math.abs(safeDy));

    return {
      x: box.cx + safeDx * scale,
      y: box.cy + safeDy * scale,
    };
  };

  // NULL 指针：从源节点右侧水平延伸
  if (toId === 'NULL') {
    const fromBox = getBox(fromNode);
    return {
      x1: fromBox.right,
      y1: fromBox.cy,
      x2: fromBox.right + 50,
      y2: fromBox.cy,
    };
  }

  const toNode = nodes.find((n) => n.id === toId);
  if (!toNode) return null;

  const fromPoint = getSmartAnchor(fromNode, toNode, 'source');
  const toPoint = getSmartAnchor(toNode, fromNode, 'target');

  return { x1: fromPoint.x, y1: fromPoint.y, x2: toPoint.x, y2: toPoint.y };
}

function getVarColor(name: string): string {
  const m: Record<string, string> = {
    L:'text-blue-400', s:'text-purple-400', pTemp:'text-purple-400',
    x:'text-green-400', target:'text-green-400', e:'text-green-400',
    p:'text-yellow-400', pTail:'text-amber-400', q:'text-yellow-400',
    found:'text-yellow-400', j:'text-cyan-400', i:'text-cyan-400',
    length:'text-orange-300', top:'text-white', 'S.top':'text-white', front:'text-white',
    rear:'text-white', pHead:'text-white', T:'text-cyan-300', depth:'text-purple-300',
    result:'text-emerald-300', operation:'text-amber-300',
  };
  return m[name] ?? 'text-slate-300';
}

function isFixedCursor(name: string): boolean {
  return ['front', 'rear', 'top', 'S.top', 'pHead', 'L', 'T', 'root'].includes(name);
}

function cursorColorHex(name: string): string {
  return isFixedCursor(name) ? '#ffffff' : '#fbbf24';
}

function nodeBox(node: Node) {
  const width = node.type === 'tree' ? 84 : node.type === 'array' || node.type === 'stack' || node.type === 'graph' ? 56 : 64;
  const height = node.type === 'tree' ? 52 : node.type === 'graph' ? 56 : 48;
  return {
    width,
    height,
    cx: node.x + width / 2,
    cy: node.y + height / 2,
    top: node.y,
    bottom: node.y + height,
    left: node.x,
    right: node.x + width,
  };
}

function cursorAnchor(node: Node, label: string, index: number, total: number) {
  const box = nodeBox(node);
  const offset = (index - (total - 1) / 2) * 30;
  const color = cursorColorHex(label);

  if (node.type === 'stack') {
    return {
      labelX: box.left - 46,
      labelY: box.cy + offset * 0.35,
      targetX: box.left,
      targetY: box.cy,
      color,
    };
  }

  if (node.type === 'array') {
    return {
      labelX: box.cx + offset,
      labelY: box.top - 38,
      targetX: box.cx,
      targetY: box.top,
      color,
    };
  }

  if (node.type === 'tree') {
    return {
      labelX: box.cx + offset,
      labelY: box.top - 34,
      targetX: box.cx,
      targetY: box.top,
      color,
    };
  }

  return {
    labelX: box.cx + offset,
    labelY: box.top - 34,
    targetX: box.cx,
    targetY: box.top,
    color,
  };
}

function pointerStroke(ptr: Pointer, isActive: boolean, isDeleting: boolean): string {
  if (ptr.color === 'warning' || isDeleting) return '#f87171';
  if (ptr.color === 'success') return '#34d399';
  if (ptr.color === 'active' || ptr.active || isActive) return '#fbbf24';
  if (ptr.type === 'dashed' || ptr.dashed) return '#cbd5e1';
  if (ptr.type === 'tree-edge') return '#22d3ee';
  if (ptr.type === 'graph-edge') return '#60a5fa';
  return '#f8fafc';
}

function formatVarValue(value: string): string {
  return value.length > 30 ? `${value.slice(0, 27)}...` : value;
}

// ======================== 扇形路径生成 ========================

/** 返回扇形 SVG path d 属性 */
function getWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

// ======================== 极简游标 ========================

function CursorLabel({ label, x, y, targetX, targetY }: { label: string; x: number; y: number; targetX: number; targetY: number }) {
  const clr = cursorColorHex(label);
  const dx = targetX - x;
  const dy = targetY - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const lineStartX = x + ux * 18;
  const lineStartY = y + uy * 18;
  const perpX = -uy * 4;
  const perpY = ux * 4;
  const baseX = targetX - ux * 10;
  const baseY = targetY - uy * 10;
  return (
    <g>
      <line x1={lineStartX} y1={lineStartY} x2={targetX} y2={targetY} stroke={clr} strokeWidth="2" />
      <polygon points={`${targetX},${targetY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`} fill={clr} />
      <text
        x={x} y={y}
        fill={clr}
        fontFamily="monospace" fontWeight="bold" fontSize="14"
        textAnchor="middle" dominantBaseline="central"
        style={{ textShadow: `0 0 8px ${clr}66` }}
      >
        {label}
      </text>
    </g>
  );
}

// ======================== 通用箭头游标 ========================

/**
 * 教学级游标指示器。direction='down' 用于节点上方（↓ 箭头指向节点），
 * direction='right' 用于栈节点左侧（→ 箭头指向节点）。
 */
function EnhancedCursor({ label, direction = 'down' }: { label: string; direction?: 'down' | 'right' }) {
  const clr = cursorColorHex(label);

  if (direction === 'right') {
    // 栈指针：文字在左，箭头 → 指向右侧节点
    return (
      <div className="flex items-center shrink-0 transition-all duration-500 ease-out" style={{ marginRight: 4 }}>
        <span className="font-mono font-extrabold text-lg leading-none tracking-tight select-none"
          style={{ color: clr, textShadow: `0 0 8px ${clr}66` }}>{label}</span>
        <svg width="16" height="12" className="ml-0.5" viewBox="0 0 16 12">
          <line x1="0" y1="6" x2="10" y2="6" stroke={clr} strokeWidth="2.5" />
          <polygon points="8,0 16,6 8,12" fill={clr} />
        </svg>
      </div>
    );
  }

  // 默认：文字在上，箭头 ↓ 指向下方节点
  return (
    <div className="flex flex-col items-center transition-all duration-500 ease-out" style={{ marginBottom: 2 }}>
      <span className="font-mono font-extrabold text-lg leading-none tracking-tight select-none"
        style={{ color: clr, textShadow: `0 0 8px ${clr}66` }}>{label}</span>
      <svg width="12" height="12" className="mt-0.5" viewBox="0 0 12 12">
        <line x1="6" y1="0" x2="6" y2="7" stroke={clr} strokeWidth="2.5" />
        <polygon points="0,5 6,12 12,5" fill={clr} />
      </svg>
    </div>
  );
}

// ======================== 主组件 ========================

export function MemoryCanvas({ currentState, isGraphEditMode = false, onGraphCanvasClick }: MemoryCanvasProps) {
  // ---- 平移 ----
  const [translate, setTranslate] = useState<Vec2>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<Vec2>({ x: 0, y: 0 });
  const mouseDownPoint = useRef<Vec2>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // ---- 缩放 ----
  const [scale, setScale] = useState(1);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    setScale((prev) => Math.min(2.5, Math.max(0.4, prev + delta)));
  }, []);

  // ---- 拖拽 ----
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, [data-no-drag]')) return;
    setIsDragging(true);
    mouseDownPoint.current = { x: e.clientX, y: e.clientY };
    dragOrigin.current = { x: e.clientX - translateRef.current.x, y: e.clientY - translateRef.current.y };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const wasDragging = isDragging;
    setIsDragging(false);
    if (!wasDragging || !isGraphEditMode || !onGraphCanvasClick) return;
    if ((e.target as HTMLElement).closest('button, input, select, [data-no-drag], [data-graph-node]')) return;
    const dx = e.clientX - mouseDownPoint.current.x;
    const dy = e.clientY - mouseDownPoint.current.y;
    if (Math.hypot(dx, dy) > 4) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    onGraphCanvasClick({
      x: (e.clientX - rect.left - translateRef.current.x) / scale,
      y: (e.clientY - rect.top - translateRef.current.y) / scale,
    });
  }, [isDragging, isGraphEditMode, onGraphCanvasClick, scale]);

  // ---- 空状态 ----
  if (!currentState) {
    return (
      <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col items-center justify-center">
        <p className="text-slate-500 text-sm">选择一个算法操作开始可视化</p>
      </div>
    );
  }

  const {
    nodes,
    pointers,
    variables,
    description,
    highlights,
    nodeCursors,
    isWarning,
    activePointers = [],
    activeNodes = [],
    activeEdges = [],
  } = currentState;

  // 分离扇形节点和普通节点
  const pieNodes = nodes.filter((n) => n.type === 'pie_wedge');
  const divNodes = nodes.filter((n) => n.type !== 'pie_wedge');

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 背景网格 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* ======== 可平移缩放内容层 ======== */}
      <div className="absolute inset-0 z-10"
        style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: '0 0' }}>

        {/* ============ SVG 层：指针连线 + 扇形饼图 ============ */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f8fafc" />
            </marker>
            <marker id="arrowhead-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
            </marker>
            <marker id="arrowhead-deleting" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
            </marker>
            <marker id="arrowhead-success" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
            </marker>
          </defs>

          {/* 连线指针 */}
          {pointers.map((ptr: Pointer) => {
            if (!ptr.from || !ptr.to) return null;
            const coords = getLineCoords(ptr.from, ptr.to, nodes, ptr.label);
            if (!coords) return null;
            const isDashed = ptr.type === 'dashed' || ptr.dashed;
            const isHL = highlights.includes(ptr.id) || activePointers.includes(ptr.id) || activeEdges.includes(ptr.id);
            const fromDel = nodes.find((n) => n.id === ptr.from)?.status;
            const toDel = nodes.find((n) => n.id === ptr.to)?.status;
            const isDeleting = fromDel === 'deleting' || toDel === 'deleting';
            const stroke = pointerStroke(ptr, isHL, isDeleting);
            const marker = isDeleting
              ? 'url(#arrowhead-deleting)'
              : isHL
                ? 'url(#arrowhead-active)'
                : ptr.color === 'success'
                  ? 'url(#arrowhead-success)'
                  : `url(#arrowhead${isDashed ? '-dashed' : ''})`;
            const midX = (coords.x1 + coords.x2) / 2;
            const midY = (coords.y1 + coords.y2) / 2;
            return (
              <g key={ptr.id} className="transition-all duration-700 ease-out">
                <line x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2}
                  stroke={stroke} strokeWidth={isHL ? '4' : '2.5'} strokeDasharray={isDashed ? '7,6' : '0'}
                  markerEnd={ptr.directed === false ? undefined : marker} className="transition-all duration-700 ease-out" />
                {ptr.label && ptr.type !== 'solid' && ptr.type !== 'dashed' && (
                  <text x={midX} y={midY - 8} fill={stroke} fontFamily="monospace" fontWeight="bold" fontSize="11" textAnchor="middle">
                    {ptr.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 游标变量箭头：由 nodeCursors 统一投影到 SVG，避免只在变量框出现 */}
          {Object.entries(nodeCursors ?? {}).flatMap(([nodeId, cursorNames]) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return [];
            if (node.type === 'pie_wedge') return [];
            return cursorNames.map((name, index) => {
              const anchor = cursorAnchor(node, name, index, cursorNames.length);
              return (
                <CursorLabel
                  key={`${nodeId}_${name}`}
                  label={name}
                  x={anchor.labelX}
                  y={anchor.labelY}
                  targetX={anchor.targetX}
                  targetY={anchor.targetY}
                />
              );
            });
          })}

          {/* ====== 扇形饼图（环形队列） ====== */}
          {pieNodes.map((node: Node) => {
            const cx = node.x;
            const cy = node.y;
            const sa = node.startAngle ?? 0;
            const ea = node.endAngle ?? Math.PI / 4;
            const r = 130; // 扇形半径
            const isActive = node.isActive ?? false;
            const isHL = highlights.includes(node.id);

            // 填充色：活跃数据橙色，否则白/灰
            const fill = isActive ? '#f97316' : '#334155'; // orange-500 : slate-700
            const stroke = isHL ? '#fbbf24' : (isActive ? '#ea580c' : '#64748b');
            const opacity = node.status === 'deleting' ? 0.4 : 1;

            const d = getWedgePath(cx, cy, r, sa, ea);
            // 中心角度（用于文本和游标定位）
            const midAngle = (sa + ea) / 2;
            const textR = r * 0.55;
            const tx = cx + textR * Math.cos(midAngle);
            const ty = cy + textR * Math.sin(midAngle);

            return (
              <g key={node.id} opacity={opacity}>
                {/* 扇形面 */}
                <path d={d} fill={fill} stroke={stroke} strokeWidth="2"
                  className="transition-all duration-700 ease-out" />
                {/* 槽位值 */}
                <text x={tx} y={ty} fill="white" fontFamily="monospace" fontWeight="bold"
                  fontSize="13" textAnchor="middle" dominantBaseline="central">
                  {node.val}
                </text>
                {/* 槽位编号 */}
                <text x={cx + (r + 14) * Math.cos(midAngle)} y={cy + (r + 14) * Math.sin(midAngle)}
                  fill="#94a3b8" fontFamily="monospace" fontSize="9" textAnchor="middle" dominantBaseline="central">
                  {node.id.replace('cq_', '')}
                </text>
                {/* Front/Rear 游标 */}
                {(nodeCursors?.[node.id] ?? []).map((cName) => {
                  const cAngle = midAngle + (cName === 'front' ? -0.15 : 0.15);
                  const labelR = r + 56;
                  const targetR = r + 4;
                  const cx2 = cx + labelR * Math.cos(cAngle);
                  const cy2 = cy + labelR * Math.sin(cAngle);
                  const targetX = cx + targetR * Math.cos(cAngle);
                  const targetY = cy + targetR * Math.sin(cAngle);
                  return (
                    <CursorLabel key={cName} label={cName} x={cx2} y={cy2} targetX={targetX} targetY={targetY} />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* ============ Div 层：普通节点 ============ */}
        {divNodes.map((node: Node) => {
          const isHL = highlights.includes(node.id) || activeNodes.includes(node.id);
          const isDel = node.status === 'deleting';
          const cursors: string[] = nodeCursors?.[node.id] ?? [];
          const isArray = node.type === 'array';
          const isStack = node.type === 'stack';
          const isTree = node.type === 'tree';
          const isGraph = node.type === 'graph';
          const isHead  = node.type === 'head';
          const isAdjHead = node.type === 'adj-list-head';
          const isAdjArc = node.type === 'adj-list-arc';
          const isActive = node.isActive ?? false;
          const isSqBoundary = node.id === 'sq_end';

          // 普通队列活跃节点 → 亮橙色背景
          const isSqActive = isArray && isActive && node.val !== '∅';

          let border = 'border-blue-500', bg = 'bg-slate-800', glow = '';
          if (isDel) { border = 'border-red-500'; bg = 'bg-red-950/60'; glow = 'shadow-[0_0_12px_rgba(239,68,68,0.5)]'; }
          else if (isHead) { border = isHL ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-amber-500'; }
          else if (isStack) {
            if (isActive) border = isHL ? 'border-violet-400 ring-2 ring-violet-400/50' : 'border-violet-500';
            else { border = isHL ? 'border-slate-400 ring-2 ring-slate-400/40' : 'border-slate-600'; bg = 'bg-slate-950/80'; }
          }
          else if (isArray) {
            if (isSqBoundary) { border = 'border-slate-500'; bg = 'bg-slate-900'; }
            else if (isSqActive) { border = 'border-orange-400'; bg = 'bg-orange-500'; }
            else { border = isHL ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-emerald-600'; }
          }
          else if (isTree) {
            const isVisitedOnly = activeNodes.includes(node.id) && !highlights.includes(node.id);
            if (isVisitedOnly) { border = 'border-emerald-400'; bg = 'bg-emerald-950/70'; }
            else { border = isHL ? 'border-cyan-300 ring-2 ring-cyan-300/50' : 'border-cyan-500'; }
          }
          else if (isGraph) { border = isHL ? 'border-amber-300 ring-4 ring-amber-300/40' : 'border-blue-400'; bg = isHL ? 'bg-blue-600' : 'bg-slate-800'; }
          else if (isAdjHead) { border = isHL ? 'border-amber-300 ring-2 ring-amber-300/50' : 'border-amber-500'; bg = 'bg-slate-800'; }
          else if (isAdjArc) { border = isHL ? 'border-blue-300 ring-2 ring-blue-300/50' : 'border-blue-500'; bg = 'bg-slate-800'; }
          else { border = isHL ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-blue-500'; }

          let label: string;
          if (node.id === 'L') label = 'L (Head)';
          else if (node.id === 'stk_-1') label = 'top = -1';
          else if (isStack) label = `data[${node.id.replace('stk_', '')}]`;
          else if (isTree) label = node.id === 'bt_root' ? 'root' : node.id.replace('bt_', '');
          else if (isGraph) label = `vex: ${node.val}`;
          else if (isAdjHead) label = `VNode ${node.val}`;
          else if (isAdjArc) label = `adjvex ${node.val}`;
          else if (node.id === 'sq_end') label = 'MaxSize';
          else if (isArray) label = `data[${node.id.replace('arr_', '').replace('sq_', '')}]`;
          else label = node.id;

          let lblClr = 'text-slate-400 bg-slate-800/80';
          if (isDel) lblClr = 'text-red-400 bg-red-900/60';
          else if (isHL) {
            if (isStack) lblClr = 'text-violet-300 bg-violet-900/60';
            else if (isArray) lblClr = isSqActive ? 'text-white' : 'text-emerald-300 bg-emerald-900/60';
            else if (isTree) lblClr = activeNodes.includes(node.id) && !highlights.includes(node.id)
              ? 'text-emerald-200 bg-emerald-900/60'
              : 'text-cyan-200 bg-cyan-900/60';
            else if (isGraph) lblClr = 'text-amber-200 bg-amber-900/60';
            else lblClr = 'text-amber-300 bg-amber-900/60';
          } else if (isSqActive) { lblClr = 'text-white'; }

          // 栈节点：横向排列（标签在右侧，避免垂直重叠）
          const isStackLayout = isStack;

          return (
            <div key={node.id}
              data-graph-node={isGraph ? true : undefined}
              className={`absolute transition-all duration-700 ease-out z-10 flex ${isStackLayout ? 'flex-row items-center' : 'flex-col items-center'} ${glow}`}
              style={{ left: node.x, top: node.y, opacity: isDel ? 0.45 : 1 }}>
              {/* 隐藏的旧游标占位保留兼容；实际箭头在 SVG 层统一绘制 */}
              {cursors.length > 0 && false && (
                <div className={`flex items-end gap-1.5 ${isStackLayout ? 'mr-1' : 'mb-0.5'}`}>
                  {cursors.map((name) => (<EnhancedCursor key={name} label={name} direction={isStackLayout ? 'right' : 'down'} />))}
                </div>
              )}

              {/* 节点盒子 */}
              {isGraph ? (
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono font-extrabold text-lg text-white shadow-lg ${bg} ${border}`}>
                  {node.val}
                </div>
              ) : isTree ? (
                <div className={`w-[84px] h-[52px] flex rounded-md border-2 overflow-hidden ${bg} ${border}`}>
                  <div className="w-[22px] border-r-2 border-slate-600 flex items-center justify-center bg-slate-700/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  </div>
                  <div className="flex-1 flex items-center justify-center font-mono font-bold text-white bg-slate-800/70">{node.val}</div>
                  <div className="w-[22px] border-l-2 border-slate-600 flex items-center justify-center bg-slate-700/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  </div>
                </div>
              ) : isStack || isArray ? (
                <div className={`border-2 rounded-sm overflow-hidden flex items-center justify-center font-mono font-bold text-sm ${bg} ${border} ${isSqActive ? 'text-white' : 'text-white'}`}
                  style={{ width: 56, height: 48 }}>{node.val}</div>
              ) : (
                <div className={`w-16 h-12 flex rounded-sm border-2 overflow-hidden ${bg} ${border}`}>
                  <div className="flex-1 flex items-center justify-center font-mono font-bold text-white bg-slate-800/50">{node.val}</div>
                  <div className="w-5 border-l-2 border-slate-600 flex items-center justify-center bg-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${isDel ? 'bg-red-400' : 'bg-slate-400'}`} /></div>
                </div>
              )}

              {/* 节点标签：栈用右置，其余用下置 */}
              <div className={`${isStackLayout ? 'ml-2' : 'mt-2'} text-xs font-mono font-semibold px-2 py-0.5 rounded backdrop-blur ${lblClr}`}>{label}</div>
            </div>
          );
        })}

        {/* NULL 标记 */}
        {pointers.filter((p) => p.from && p.to === 'NULL').map((ptr, idx) => {
          if (!ptr.from) return null;
          const coords = getLineCoords(ptr.from, 'NULL', nodes, ptr.label);
          if (!coords) return null;
          return (<div key={`null_${idx}`} className="absolute text-slate-500 font-mono font-bold transition-all duration-500 ease-in-out"
            style={{ left: coords.x2 + 5, top: coords.y2 - 10 }}>NULL</div>);
        })}
      </div>

      {/* ======== 固定覆盖层 ======== */}

      {/* Memory Scope */}
      <div data-no-drag className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-xl pointer-events-none z-30 max-w-[220px]">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">主要变量</h3>
        <div className="space-y-1.5 text-sm font-mono text-slate-200">
          {Object.entries(variables).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-4 min-w-0">
              <span className="shrink-0">{name}</span>
              <span className={`${getVarColor(name)} truncate text-right`}>{formatVarValue(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 底部状态解析 */}
      <div data-no-drag className={`absolute bottom-6 left-6 right-6 backdrop-blur shadow-xl border rounded-xl p-4 flex gap-4 items-start z-30 transition-colors duration-300 ${
        isWarning ? 'bg-red-950/90 border-red-600 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'bg-slate-800/95 border-slate-600'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
          isWarning ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}`}>
          {isWarning ? <AlertTriangle size={16} /> : <RefreshCw size={16} />}
        </div>
        <div>
          <h4 className={`text-sm font-bold mb-1 ${isWarning ? 'text-red-400' : 'text-white'}`}>
            {isWarning ? '⚠ 异常状态' : '执行状态解析'}
          </h4>
          <p className={`text-sm leading-relaxed ${isWarning ? 'text-red-300 font-bold' : 'text-slate-300'}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}
