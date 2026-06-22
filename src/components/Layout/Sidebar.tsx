// ============================================================
// src/components/Layout/Sidebar.tsx
// 左侧考点导航栏 —— 纯展示组件
// ============================================================

import { List, Layers, Share2, Search, ArrowDownUp } from 'lucide-react';
import type { MenuGroup, MenuItem, ModuleId } from '@/types';

// ---- 图标名 → 组件映射 ----
const ICON_MAP: Record<string, React.ReactNode> = {
  List: <List size={18} />,
  Layers: <Layers size={18} />,
  Share2: <Share2 size={18} />,
  Search: <Search size={18} />,
  ArrowDownUp: <ArrowDownUp size={18} />,
};

// ---- 菜单数据（已合并链表子菜单） ----
const MENUS: MenuGroup[] = [
  { title: '线性表', icon: 'List', items: ['顺序表', '单链表'] },
  { title: '栈和队列', icon: 'Layers', items: ['顺序栈', '普通队列', '环形队列'] },
  { title: '二叉树与哈夫曼树', icon: 'Share2', items: [{ label: '二叉树', children: ['二叉树的性质'] }, '哈夫曼树'] },
  { title: '图结构', icon: 'Share2', items: ['存储结构-邻接矩阵', '存储结构-邻接链表', '广度优先搜索-BFS', '深度优先搜索-DFS'] },
  { title: '查找', icon: 'Search', items: ['折半查找', '哈希表(线性探测)'] },
  { title: '排序', icon: 'ArrowDownUp', items: ['直接插入排序', '快速排序', '堆排序'] },
];

// ---- Props ----

export interface SidebarProps {
  activeModule: ModuleId;
  onModuleChange: (moduleId: ModuleId) => void;
}

// ---- 组件 ----

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const renderItem = (item: MenuItem, level = 0): React.ReactNode => {
    const label = typeof item === 'string' ? item : item.label;
    const isActive = label === activeModule;

    return (
      <div key={label} className="space-y-1">
        <button
          onClick={() => onModuleChange(label as ModuleId)}
          className={`relative w-full text-left py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            level === 0 ? 'px-3' : 'pl-7 pr-3 text-xs'
          } ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-md" />
          )}
          {level > 0 && <span className="mr-2 text-slate-300">└</span>}
          {label}
        </button>
        {typeof item !== 'string' && item.children.map((child) => renderItem(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
      {/* Logo 区域 */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
          D
        </div>
        <span className="font-bold text-lg tracking-wide text-slate-800">
          DS Visualizer
        </span>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {MENUS.map((menu) => (
          <div key={menu.title} className="space-y-1">
            {/* 分组标题 */}
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase px-2 mb-2">
              {ICON_MAP[menu.icon] ?? null}
              <span>{menu.title}</span>
            </div>

            {/* 子菜单项 */}
            {menu.items.map((item) => renderItem(item))}
          </div>
        ))}
      </div>
    </div>
  );
}
