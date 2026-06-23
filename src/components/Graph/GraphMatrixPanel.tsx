import type { GraphVertex } from '@/types';

interface GraphMatrixPanelProps {
  vertices: GraphVertex[];
  matrix: number[][];
  activeCells?: string[];
}

export function GraphMatrixPanel({ vertices, matrix, activeCells = [] }: GraphMatrixPanelProps) {
  return (
    <div className="h-full min-h-0 bg-white border-l border-pink-100 flex flex-col">
      <div className="px-4 py-3 border-b border-pink-100 bg-pink-50/50">
        <h2 className="text-sm font-bold text-pink-600">邻接矩阵</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {vertices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            点击画布创建顶点
          </div>
        ) : (
          <table className="border-collapse text-sm font-mono">
            <thead>
              <tr>
                <th className="w-9 h-9 border border-pink-100 bg-pink-50 text-slate-400" />
                {vertices.map((vertex) => (
                  <th key={vertex.id} className="w-9 h-9 border border-pink-100 bg-pink-50 text-slate-700">
                    {vertex.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vertices.map((rowVertex, i) => (
                <tr key={rowVertex.id}>
                  <th className="w-9 h-9 border border-pink-100 bg-pink-50 text-slate-700">
                    {rowVertex.label}
                  </th>
                  {vertices.map((colVertex, j) => {
                    const cellId = `matrix_${i}_${j}`;
                    const isActive = activeCells.includes(cellId);
                    return (
                      <td
                        key={`${rowVertex.id}_${colVertex.id}`}
                        className={`w-9 h-9 border text-center transition-colors ${
                          isActive
                            ? 'border-rose-300 bg-rose-100 text-rose-700 font-bold'
                            : matrix[i]?.[j] === 1
                              ? 'border-pink-200 bg-pink-50 text-pink-700 font-semibold'
                              : 'border-pink-100 bg-white text-slate-400'
                        }`}
                      >
                        {matrix[i]?.[j] ?? 0}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
