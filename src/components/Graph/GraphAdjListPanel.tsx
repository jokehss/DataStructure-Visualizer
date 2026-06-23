import type { GraphVertex } from '@/types';

interface GraphAdjListPanelProps {
  vertices: GraphVertex[];
  adjacencyList?: Record<string, string[]>;
}

export function GraphAdjListPanel({ vertices, adjacencyList = {} }: GraphAdjListPanelProps) {
  return (
    <div className="h-full min-h-0 bg-white border-l border-pink-100 flex flex-col">
      <div className="px-4 py-3 border-b border-pink-100 bg-pink-50/50">
        <h2 className="text-sm font-bold text-pink-600">邻接链表</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {vertices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            点击画布创建顶点
          </div>
        ) : (
          <div className="space-y-3">
            {vertices.map((vertex) => {
              const neighbors = adjacencyList[vertex.label] ?? [];
              return (
                <div key={vertex.id} className="flex items-center gap-2 text-sm font-mono">
                  <span className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 font-bold flex items-center justify-center shadow-sm">
                    {vertex.label}
                  </span>
                  <span className="text-slate-400">first</span>
                  <span className="text-slate-400">→</span>
                  {neighbors.map((item) => (
                    <span key={`${vertex.label}_${item}`} className="inline-flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 font-semibold shadow-sm">
                        {item}
                      </span>
                      <span className="text-slate-400">→</span>
                    </span>
                  ))}
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold">NULL</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
