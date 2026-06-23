// ============================================================
// src/components/CodeViewer/CodePanel.tsx
// 代码追踪面板 —— 纯展示组件
//
// 职责：接收 codeLine，渲染 C 语言代码并高亮对应行
// 约束：无 setTimeout、无算法逻辑
// ============================================================

// ---- Props ----

export interface CodePanelProps {
  /** 当前高亮的代码行号 (1-based)；0 表示不高亮任何行 */
  codeLine: number;
  /** 要展示的 C 代码字符串（多行） */
  codeString: string;
}

// ---- 组件 ----

export function CodePanel({ codeLine, codeString }: CodePanelProps) {
  const lines = codeString.split('\n');

  return (
    <div className="w-full h-full bg-white border-l border-pink-200 flex flex-col shadow-[-10px_0_30px_rgba(244,114,182,0.06)] z-10">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-b border-pink-100">
        <span className="text-xs font-mono font-bold tracking-wider text-pink-500">C/C++ ENGINE</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        </div>
      </div>

      {/* 代码行 */}
      <div className="flex-1 overflow-y-auto font-mono text-[13px] py-4 leading-[1.8] text-slate-600 custom-scrollbar">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isActive = codeLine === lineNum;

          return (
            <div
              key={lineNum}
              className={`flex px-2 py-0.5 transition-all duration-300 ${
                isActive
                  ? 'bg-pink-50/90 border-l-2 border-pink-500 text-pink-700 font-bold shadow-sm'
                  : 'border-l-2 border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className={`w-10 text-right pr-4 select-none mr-2 ${isActive ? 'text-pink-500' : 'text-slate-300'}`}>
                {lineNum}
              </span>
              <span className="whitespace-pre overflow-x-hidden text-ellipsis">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
