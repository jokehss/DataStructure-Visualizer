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
    <div className="w-full h-full bg-[#1e1e1e] border-l border-slate-700 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.1)] z-10">
      {/* 标题栏：模拟 macOS 窗口按钮 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#252526] border-b border-[#333]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="ml-2 text-xs font-mono text-slate-400">c/c++</span>
      </div>

      {/* 代码行 */}
      <div className="flex-1 overflow-y-auto font-mono text-sm py-2 custom-scrollbar">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isActive = codeLine === lineNum;

          return (
            <div
              key={lineNum}
              className={`flex px-2 py-0.5 transition-colors duration-200 ${
                isActive
                  ? 'bg-[#062f4a] border-l-4 border-blue-500 text-white'
                  : 'border-l-4 border-transparent text-slate-400'
              }`}
            >
              <span className="w-8 text-right pr-4 opacity-50 select-none">
                {lineNum}
              </span>
              <span className="whitespace-pre">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
