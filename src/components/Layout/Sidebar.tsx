// ============================================================
// src/components/Layout/Sidebar.tsx
// 左侧考点导航栏 —— 纯展示组件
// ============================================================

import { List, Layers, Share2, Search, ArrowDownUp, Heart } from 'lucide-react';
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
          className={`group relative w-full text-left py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
            level === 0 ? 'px-3' : 'pl-8 pr-3 text-xs'
          } ${
            isActive
              ? 'bg-gradient-to-r from-pink-100/90 to-rose-50/70 text-pink-700 border border-pink-200 shadow-sm shadow-pink-100/80'
              : 'text-slate-600 border border-transparent hover:bg-pink-50/80 hover:text-pink-600'
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-0 h-full w-1 bg-pink-400 rounded-r-md" />
          )}
          <span className="relative z-10">
            {level > 0 && <span className="mr-2 text-pink-300">└</span>}
            {label}
          </span>
        </button>
        {typeof item !== 'string' && item.children.map((child) => renderItem(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white/65 backdrop-blur-xl border-r border-pink-200/70 flex flex-col shadow-[4px_0_24px_rgba(244,114,182,0.08)] z-10">
      {/* Logo 区域 */}
      <div className="p-5 border-b border-pink-200/70 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-200 animate-[pulse_3s_ease-in-out_infinite]">
          <Heart size={20} fill="currentColor" className="opacity-95" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-wide text-slate-800">DS Universe</span>
          <span className="text-[10px] text-pink-500 uppercase tracking-widest font-semibold">Sakura Engine</span>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {MENUS.map((menu) => (
          <div key={menu.title} className="space-y-2">
            {/* 分组标题 */}
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider px-2 mb-3">
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
