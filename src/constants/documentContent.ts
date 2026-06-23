import type { ModuleId } from '@/types';

export interface DocumentSection {
  heading: string;
  content: string;
  formula?: string;
  code?: string;
  list?: string[];
}

export interface DocumentContent {
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
}

export const DOCUMENT_MAP: Partial<Record<ModuleId, DocumentContent>> = {
  '二叉树的性质': {
    title: '二叉树的性质',
    subtitle: '用结点度数、层数、深度和顺序存储下标关系理解二叉树。',
    sections: [
      {
        heading: '基本概念',
        content: '二叉树是一种递归定义的树形结构。每个结点最多有两个孩子，分别称为左孩子和右孩子；左子树和右子树有顺序，交换后通常视为不同的二叉树。空树也是二叉树，它常作为递归出口或空孩子出现。',
        list: [
          '二叉树每个结点最多有两个孩子。',
          '左子树和右子树有顺序。',
          '空树也是二叉树。',
        ],
      },
      {
        heading: '常用性质',
        content: '这些性质常用于分析二叉树规模、判断存储位置，以及验证树的结构是否合理。',
        list: [
          '第 i 层最多有 2^(i-1) 个结点。',
          '深度为 h 的二叉树最多有 2^h - 1 个结点。',
          '对任何非空二叉树，若叶子结点数为 n0，度为 2 的结点数为 n2，则 n0 = n2 + 1。',
          '若采用顺序存储，下标 i 的左孩子为 2i + 1，右孩子为 2i + 2，父结点为 floor((i - 1) / 2)。',
        ],
      },
      {
        heading: '性质 n0 = n2 + 1 的解释',
        content: '设总结点数为 n，度为 0、1、2 的结点数分别为 n0、n1、n2。因为 n = n0 + n1 + n2；除根结点外，每个结点都有一条来自父结点的边，所以边数为 n - 1。另一方面，度为 1 的结点贡献 1 条边，度为 2 的结点贡献 2 条边，因此边数也等于 n1 + 2n2。由 n - 1 = n1 + 2n2 推出 n0 = n2 + 1。',
        formula: 'n = n0 + n1 + n2；n - 1 = n1 + 2n2；所以 n0 = n2 + 1',
        list: [
          '设总结点数为 n。',
          '设度为 0、1、2 的结点数分别为 n0、n1、n2。',
          'n = n0 + n1 + n2。',
          '除根结点外，每个结点都有一条来自父结点的边。',
          '边数也等于 n1 + 2n2。',
          '所以 n - 1 = n1 + 2n2，推出 n0 = n2 + 1。',
        ],
      },
      {
        heading: '和画布演示的对应关系',
        content: '画布中的 n 表示总结点数，n0 表示叶子结点数，n1 表示只有一个孩子的结点数，n2 表示有两个孩子的结点数，height 表示树高。当前示例树会高亮不同类型的结点，用来验证 n = n0 + n1 + n2 和 n0 = n2 + 1。',
      },
    ],
  },
  '哈夫曼树': {
    title: '哈夫曼树',
    subtitle: '哈夫曼树是带权路径长度最小的最优二叉树，是哈夫曼编码的基础。',
    sections: [
      {
        heading: '什么是哈夫曼树',
        content: '哈夫曼树又称最优二叉树。给定 n 个带权叶子结点，哈夫曼树是在所有可能的二叉树中带权路径长度 WPL 最小的二叉树。',
        formula: 'WPL = Σ weight(i) × pathLength(i)',
      },
      {
        heading: '核心概念',
        content: '理解哈夫曼树时，重点关注权值、路径长度和编码之间的关系。',
        list: [
          '权值 weight',
          '路径长度 path length',
          '带权路径长度 WPL',
          '哈夫曼编码 Huffman Coding',
          '前缀编码 prefix code',
        ],
      },
      {
        heading: '构造步骤',
        content: '哈夫曼树通过反复合并权值最小的两棵树构造。',
        list: [
          '将所有权值看成 n 棵只有根结点的树。',
          '每次选择权值最小的两棵树。',
          '创建一个新结点作为它们的父结点。',
          '新结点权值等于两棵子树权值之和。',
          '将新树放回集合。',
          '重复直到只剩一棵树。',
        ],
      },
      {
        heading: '示例',
        content: '给定权值 5, 9, 12, 13, 16, 45，构造过程如下。',
        list: [
          '5 和 9 合并为 14。',
          '12 和 13 合并为 25。',
          '14 和 16 合并为 30。',
          '25 和 30 合并为 55。',
          '45 和 55 合并为 100。',
        ],
      },
      {
        heading: '哈夫曼编码特点',
        content: '哈夫曼编码是一种典型的变长编码，适合压缩高频和低频出现概率差异较大的数据。',
        list: [
          '高频字符编码短。',
          '低频字符编码长。',
          '任一字符编码不是另一个字符编码的前缀。',
          '适合数据压缩。',
        ],
      },
      {
        heading: 'C 语言结构体示例',
        content: '下面是常见的顺序存储结构体定义，用 parent、lchild、rchild 保存结点之间的关系。',
        code: `typedef struct {
    int weight;
    int parent;
    int lchild;
    int rchild;
} HTNode;`,
      },
    ],
  },
};
