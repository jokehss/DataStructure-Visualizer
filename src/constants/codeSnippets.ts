// ============================================================
// src/constants/codeSnippets.ts
// 单链表 + 顺序表 所有 C 语言源码模板
// ============================================================

import type { OperationType } from '@/types';

// ==================== 单链表 ====================

export const HEAD_INSERT_CODE = `typedef struct LNode {
    int data;
    struct LNode *next;
} LNode, *LinkList;

// 单链表 - 头插法创建
LinkList List_HeadInsert(LinkList &L) {
    LNode *s; int x;
    L = (LinkList)malloc(sizeof(LNode));
    L->next = NULL;
    scanf("%d", &x);
    while(x != 999) {
        s = (LNode*)malloc(sizeof(LNode));
        s->data = x;
        s->next = L->next;
        L->next = s;
        scanf("%d", &x);
    }
    return L;
}`;

export const TAIL_INSERT_CODE = `typedef struct LNode {
    int data;
    struct LNode *next;
} LNode, *LinkList;

// 单链表 - 尾插法创建
LinkList List_TailInsert(LinkList &L) {
    LNode *s, *pTail; int x;
    L = (LinkList)malloc(sizeof(LNode));
    L->next = NULL;
    pTail = L;
    scanf("%d", &x);
    while(x != 999) {
        s = (LNode*)malloc(sizeof(LNode));
        s->data = x;
        s->next = NULL;
        pTail->next = s;
        pTail = s;
        scanf("%d", &x);
    }
    return L;
}`;

export const FIND_CODE = `// 单链表 - 按值查找
LNode* LocateElem(LinkList L, ElemType e) {
    LNode *p = L->next;
    while(p != NULL) {
        if(p->data == e)
            return p;
        p = p->next;
    }
    return NULL;
}`;

export const INSERT_CODE = `// 单链表 - 按位序插入
bool List_Insert(LinkList &L, int i, ElemType e) {
    LNode *p = L;
    int j = 0;
    while(p != NULL && j < i-1) {
        p = p->next;
        j++;
    }
    if(p == NULL) return false;
    LNode *pTemp = (LNode*)malloc(sizeof(LNode));
    pTemp->data = e;
    pTemp->next = p->next;
    p->next = pTemp;
    return true;
}`;

export const DELETE_CODE = `// 单链表 - 按位序删除
bool List_Del(LinkList &L, int i, ElemType &e) {
    LNode *p = L;
    int j = 0;
    while(p != NULL && j < i-1) {
        p = p->next;
        j++;
    }
    if(p == NULL || p->next == NULL)
        return false;
    LNode *q = p->next;
    e = q->data;
    p->next = q->next;
    free(q);
    return true;
}`;

// ==================== 顺序表 ====================

export const SEQ_INIT_CODE = `// 顺序表 - 初始化与建表
#define MaxSize 50
typedef struct {
    ElemType data[MaxSize];
    int length;
} SqList;

void InitList(SqList &L) {
    L.length = 0;
}
// 逐个插入元素建表
void CreateList(SqList &L, ElemType a[], int n) {
    for(int i = 0; i < n; i++) {
        L.data[i] = a[i];
        L.length++;
    }
}`;

export const SEQ_INSERT_CODE = `// 顺序表 - 按位序插入
bool List_Insert(SqList &L, int i, ElemType e) {
    if(i < 1 || i > L.length + 1)
        return false;            // i 值不合法
    for(int j = L.length; j >= i; j--)
        L.data[j] = L.data[j-1]; // 元素逐格右移
    L.data[i-1] = e;             // 新元素填入空位
    L.length++;
    return true;
}`;

export const SEQ_DELETE_CODE = `// 顺序表 - 按位序删除
bool List_Delete(SqList &L, int i, ElemType &e) {
    if(i < 1 || i > L.length)
        return false;            // i 值不合法
    e = L.data[i-1];             // 取出被删元素
    for(int j = i; j < L.length; j++)
        L.data[j-1] = L.data[j]; // 元素逐格左移
    L.length--;
    return true;
}`;

export const SEQ_FIND_CODE = `// 顺序表 - 按值查找
int LocateElem(SqList L, ElemType e) {
    for(int i = 0; i < L.length; i++) {
        if(L.data[i] == e)
            return i;            // 找到，返回索引
    }
    return -1;                   // 未找到
}`;

// ==================== 顺序栈 ====================

export const STACK_CODE = `// 顺序栈 — 入栈 & 出栈
#define MaxSize 50
typedef struct {
    ElemType data[MaxSize];
    int top;                // 栈顶指针
} SqStack;

bool Push(SqStack &S, ElemType x) {
    if(S.top == MaxSize - 1)
        return false;       // 栈满 — 上溢
    ++S.top;                // 栈顶指针先上移
    S.data[S.top] = x;      // 再写入栈顶单元
    return true;
}
bool Pop(SqStack &S, ElemType &e) {
    if(S.top == -1)
        return false;       // 栈空 — 下溢
    e = S.data[S.top];      // 取出栈顶元素
    S.top--;                // 栈顶指针下移
    return true;
}`;

export const CIRCULAR_QUEUE_CODE = `// 环形队列 — 入队 & 出队
#define MaxSize 8
typedef struct {
    ElemType data[MaxSize];
    int front, rear;
} SqQueue;

bool EnQueue(SqQueue &Q, ElemType x) {
    if((Q.rear + 1) % MaxSize == Q.front)
        return false;       // 队满 (牺牲一个单元)
    Q.data[Q.rear] = x;
    Q.rear = (Q.rear + 1) % MaxSize;
    return true;
}
bool DeQueue(SqQueue &Q, ElemType &e) {
    if(Q.front == Q.rear)
        return false;       // 队空
    e = Q.data[Q.front];
    Q.front = (Q.front + 1) % MaxSize;
    return true;
}`;

// ==================== 普通队列 ====================

export const SEQ_QUEUE_CODE = `// 普通队列 — 入队 & 出队 & 查找
#define MaxSize 6
typedef struct {
    ElemType data[MaxSize];
    int front, rear;
} SeqQueue;

bool EnQueue(SeqQueue &Q, ElemType x) {
    if(Q.rear == MaxSize)
        return false;       // 队满 (或假溢出!)
    Q.data[Q.rear] = x;
    Q.rear++;
    return true;
}
bool DeQueue(SeqQueue &Q, ElemType &e) {
    if(Q.front == Q.rear)
        return false;       // 队空
    e = Q.data[Q.front];
    Q.front++;
    return true;
}
int LocateElem(SeqQueue Q, ElemType e) {
    for(int i = Q.front; i < Q.rear; i++)
        if(Q.data[i] == e) return i;
    return -1;              // 未找到
}`;

// ==================== 二叉树 ====================

export const BINARY_TREE_BUILD_CODE = `typedef struct BiTNode {
    ElemType data;
    struct BiTNode *lchild, *rchild;
} BiTNode, *BiTree;

void CreateBiTree(BiTree &T) {
    scanf("%c", &ch);
    if(ch == '#') T = NULL;
    else {
        T = (BiTNode*)malloc(sizeof(BiTNode));
        T->data = ch;
        CreateBiTree(T->lchild);
        CreateBiTree(T->rchild);
    }
}`;

export const BINARY_TREE_PREORDER_CODE = `void PreOrder(BiTree T) {
    if(T != NULL) {
        visit(T);
        PreOrder(T->lchild);
        PreOrder(T->rchild);
    }
}`;

export const BINARY_TREE_INORDER_CODE = `void InOrder(BiTree T) {
    if(T != NULL) {
        InOrder(T->lchild);
        visit(T);
        InOrder(T->rchild);
    }
}`;

export const BINARY_TREE_POSTORDER_CODE = `void PostOrder(BiTree T) {
    if(T != NULL) {
        PostOrder(T->lchild);
        PostOrder(T->rchild);
        visit(T);
    }
}`;

export const BINARY_TREE_PROPERTIES_CODE = `// 二叉树常用性质
// n0: 叶结点数, n1: 度为1的结点数, n2: 度为2的结点数
// 性质1: n0 = n2 + 1
// 性质2: n = n0 + n1 + n2
// 性质3: 第 i 层最多有 2^(i-1) 个结点
// 性质4: 深度为 h 的二叉树最多有 2^h - 1 个结点
// 链式结构中，非空孩子指针数 = n - 1
// 空孩子指针数 = n + 1
// branch = n1 + 2*n2 = n - 1
// 因此 n0 = n2 + 1`;

// ==================== 图结构 ====================

export const GRAPH_MATRIX_CODE = `#include <stdio.h>
#define MAXV 10

typedef struct {
    char vex[MAXV];
    int edge[MAXV][MAXV];
    int vexnum;
} MGraph;

void InitGraph(MGraph *G) {
    G->vexnum = 0;
    for(int i = 0; i < MAXV; i++) {
        for(int j = 0; j < MAXV; j++) {
            G->edge[i][j] = 0;
        }
    }
}

int LocateVex(MGraph G, char v) {
    for(int i = 0; i < G.vexnum; i++) {
        if(G.vex[i] == v) return i;
    }
    return -1;
}

void AddEdge(MGraph *G, int i, int j) {
    G->edge[i][j] = 1;
    G->edge[j][i] = 1;
}`;

export const GRAPH_BFS_CODE = `#include <stdio.h>
#define MAXV 10

typedef struct {
    char vex[MAXV];
    int edge[MAXV][MAXV];
    int vexnum;
} MGraph;

int LocateVex(MGraph G, char v) {
    for(int i = 0; i < G.vexnum; i++) {
        if(G.vex[i] == v) return i;
    }
    return -1;
}

void BFS(MGraph G, int start) {
    int visited[MAXV] = {0};
    int queue[MAXV];
    int front = 0, rear = 0;

    printf("%c ", G.vex[start]);
    visited[start] = 1;
    queue[rear++] = start;

    while(front < rear) {
        int v = queue[front++];

        for(int i = 0; i < G.vexnum; i++) {
            if(G.edge[v][i] == 1 && visited[i] == 0) {
                printf("%c ", G.vex[i]);
                visited[i] = 1;
                queue[rear++] = i;
            }
        }
    }
}`;

export const GRAPH_DFS_CODE = `#include <stdio.h>
#define MAXV 10

typedef struct {
    char vex[MAXV];
    int edge[MAXV][MAXV];
    int vexnum;
} MGraph;

int LocateVex(MGraph G, char v) {
    for(int i = 0; i < G.vexnum; i++) {
        if(G.vex[i] == v) return i;
    }
    return -1;
}

int visited[MAXV];

void DFS(MGraph G, int v) {
    printf("%c ", G.vex[v]);
    visited[v] = 1;

    for(int i = 0; i < G.vexnum; i++) {
        if(G.edge[v][i] == 1 && visited[i] == 0) {
            DFS(G, i);
        }
    }
}

void DFSTraverse(MGraph G, int start) {
    for(int i = 0; i < G.vexnum; i++) {
        visited[i] = 0;
    }
    DFS(G, start);
}`;

export const GRAPH_PLACEHOLDER_CODE = `// 邻接链表功能待开发
// 本模块当前仅作为目录占位。
// 后续可定义 ArcNode、VNode 和 ALGraph 结构体实现。`;

export const GRAPH_ADJ_LIST_CODE = `#include <stdio.h>
#include <stdlib.h>

#define MAXV 10

typedef struct ArcNode {
    int adjvex;
    struct ArcNode *next;
} ArcNode;

typedef struct VNode {
    char data;
    ArcNode *first;
} VNode;

typedef struct {
    VNode adjList[MAXV];
    int vexnum;
    int arcnum;
} ALGraph;

int LocateVex(ALGraph *G, char v) {
    for (int i = 0; i < G->vexnum; i++) {
        if (G->adjList[i].data == v) return i;
    }
    return -1;
}

void AddEdge(ALGraph *G, char a, char b) {
    int i = LocateVex(G, a);
    int j = LocateVex(G, b);
    if (i == -1 || j == -1) return;

    ArcNode *p = (ArcNode *)malloc(sizeof(ArcNode));
    p->adjvex = j;
    p->next = G->adjList[i].first;
    G->adjList[i].first = p;

    ArcNode *q = (ArcNode *)malloc(sizeof(ArcNode));
    q->adjvex = i;
    q->next = G->adjList[j].first;
    G->adjList[j].first = q;

    G->arcnum++;
}`;

export const BINARY_SEARCH_CODE = `#include <stdio.h>

int BinarySearch(int a[], int n, int key) {
    int low = 0;
    int high = n - 1;

    while (low <= high) {
        int mid = (low + high) / 2;

        if (a[mid] == key) {
            return mid;
        } else if (key < a[mid]) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return -1;
}

int main() {
    int a[10] = {1,2,3,4,5,6,7,8,9,10};
    int key = 7;
    int pos = BinarySearch(a, 10, key);

    if (pos != -1)
        printf("found at %d\\n", pos);
    else
        printf("not found\\n");

    return 0;
}`;

export const INSERTION_SORT_CODE = `#include <stdio.h>

void InsertSort(int a[], int n) {
    for (int i = 1; i < n; i++) {
        int temp = a[i];
        int j = i - 1;

        while (j >= 0 && a[j] > temp) {
            a[j + 1] = a[j];
            j--;
        }

        a[j + 1] = temp;
    }
}

int main() {
    int a[10] = {10,3,7,1,9,2,8,5,4,6};
    int n = 10;

    InsertSort(a, n);

    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }

    return 0;
}`;

export const QUICK_SORT_CODE = `#include <stdio.h>

int Partition(int a[], int low, int high) {
    int pivot = a[low];

    while (low < high) {
        while (low < high && a[high] >= pivot) {
            high--;
        }
        a[low] = a[high];

        while (low < high && a[low] <= pivot) {
            low++;
        }
        a[high] = a[low];
    }

    a[low] = pivot;
    return low;
}

void QuickSort(int a[], int low, int high) {
    if (low < high) {
        int pivotPos = Partition(a, low, high);
        QuickSort(a, low, pivotPos - 1);
        QuickSort(a, pivotPos + 1, high);
    }
}

int main() {
    int a[10] = {10,3,7,1,9,2,8,5,4,6};
    int n = 10;

    QuickSort(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }

    return 0;
}`;

export const HEAP_SORT_CODE = `#include <stdio.h>

void Swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

void HeapAdjust(int a[], int n, int parent) {
    int largest = parent;

    while (1) {
        int left = 2 * parent + 1;
        int right = 2 * parent + 2;

        if (left < n && a[left] > a[largest]) {
            largest = left;
        }

        if (right < n && a[right] > a[largest]) {
            largest = right;
        }

        if (largest == parent) {
            break;
        }

        Swap(&a[parent], &a[largest]);
        parent = largest;
    }
}

void HeapSort(int a[], int n) {
    for (int i = n / 2 - 1; i >= 0; i--) {
        HeapAdjust(a, n, i);
    }

    for (int i = n - 1; i > 0; i--) {
        Swap(&a[0], &a[i]);
        HeapAdjust(a, i, 0);
    }
}

int main() {
    int a[10] = {10,3,7,1,9,2,8,5,4,6};
    int n = 10;

    HeapSort(a, n);

    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }

    return 0;
}`;

// ==================== 操作类型 → 代码模板映射 ====================

export const CODE_MAP: Record<OperationType, string> = {
  // 单链表
  headInsert: HEAD_INSERT_CODE,
  tailInsert: TAIL_INSERT_CODE,
  find: FIND_CODE,
  insert: INSERT_CODE,
  delete: DELETE_CODE,
  // 顺序表
  seqInit: SEQ_INIT_CODE,
  seqInsert: SEQ_INSERT_CODE,
  seqDelete: SEQ_DELETE_CODE,
  seqFind: SEQ_FIND_CODE,
  // 栈
  stackInit: STACK_CODE,
  stackPush: STACK_CODE,
  stackPop: STACK_CODE,
  // 环形队列
  circularQueueInit: CIRCULAR_QUEUE_CODE,
  queueEnqueue: CIRCULAR_QUEUE_CODE,
  queueDequeue: CIRCULAR_QUEUE_CODE,
  // 普通队列
  normalQueueInit: SEQ_QUEUE_CODE,
  seqQueueEnqueue: SEQ_QUEUE_CODE,
  seqQueueDequeue: SEQ_QUEUE_CODE,
  seqQueueFind: SEQ_QUEUE_CODE,
  // 二叉树
  binaryTreeBuild: BINARY_TREE_BUILD_CODE,
  binaryTreePreorder: BINARY_TREE_PREORDER_CODE,
  binaryTreeInorder: BINARY_TREE_INORDER_CODE,
  binaryTreePostorder: BINARY_TREE_POSTORDER_CODE,
  binaryTreeProperties: BINARY_TREE_PROPERTIES_CODE,
  // 图结构
  graphMatrix: GRAPH_MATRIX_CODE,
  graphAddEdge: GRAPH_MATRIX_CODE,
  graphBfs: GRAPH_BFS_CODE,
  graphDfs: GRAPH_DFS_CODE,
  graphPlaceholder: GRAPH_PLACEHOLDER_CODE,
  graphAdjList: GRAPH_ADJ_LIST_CODE,
  binarySearch: BINARY_SEARCH_CODE,
  insertionSort: INSERTION_SORT_CODE,
  quickSort: QUICK_SORT_CODE,
  heapSort: HEAP_SORT_CODE,
  createSortArray: INSERTION_SORT_CODE,
  shuffleSortArray: INSERTION_SORT_CODE,
  document: '',
};
