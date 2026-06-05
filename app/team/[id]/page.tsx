"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase";
import type { Category, Todo } from "@/lib/types";

const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

// ── フォルダ（左サイドバー用ドロップゾーン） ─────────────────
function DroppableFolder({
  id, label, color, count, isActive, onClick, onDelete,
}: {
  id: string; label: string; color?: string; count: number;
  isActive: boolean; onClick: () => void; onDelete?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all select-none ${
        isOver
          ? "bg-indigo-50 ring-2 ring-indigo-300"
          : isActive
          ? "bg-slate-800 text-white"
          : "hover:bg-slate-100 text-slate-600"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-xs tabular-nums ${isActive ? "text-slate-300" : "text-slate-400"}`}>{count}</span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`opacity-0 group-hover:opacity-100 transition-opacity ml-1 ${
              isActive ? "text-slate-400 hover:text-red-300" : "text-slate-400 hover:text-red-400"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── タスクカード ─────────────────────────────────────────────
function SortableTodoItem({
  todo, isSelected, onToggleSelect, onToggle, onDelete, onMove, categories,
}: {
  todo: Todo; isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, categoryId: string | null) => void;
  categories: Category[];
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id, disabled: todo.done });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border transition-all shadow-sm ${
        isSelected ? "border-indigo-300 bg-indigo-50/60"
        : todo.done ? "border-slate-100 opacity-50"
        : "border-slate-200"
      }`}
    >
      {/* 選択チェック */}
      <button
        onClick={() => onToggleSelect(todo.id)}
        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 hover:border-indigo-400"
        }`}
      >
        {isSelected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* ドラッグハンドル */}
      {!todo.done ? (
        <button
          {...attributes} {...listeners}
          className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
      ) : <div className="w-3.5 flex-shrink-0" />}

      {/* 完了ボタン */}
      <button
        onClick={() => onToggle(todo.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          todo.done ? "bg-slate-700 border-slate-700" : "border-slate-300 hover:border-slate-500"
        }`}
      >
        {todo.done && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* テキスト */}
      <span className={`flex-1 text-sm truncate ${todo.done ? "line-through text-slate-400" : "text-slate-700"}`}>
        {todo.text}
      </span>

      {/* ⋮ メニュー */}
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="text-slate-300 hover:text-slate-500 transition-colors p-0.5 rounded"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {showMenu && (
          <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 w-40 overflow-hidden">
            <p className="text-xs text-slate-400 px-3 py-1.5 border-b border-slate-100">フォルダに移動</p>
            <button
              onClick={() => { onMove(todo.id, null); setShowMenu(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                todo.category_id === null ? "font-semibold text-slate-800" : "text-slate-600"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />未分類
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { onMove(todo.id, cat.id); setShowMenu(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                  todo.category_id === cat.id ? "font-semibold text-slate-800" : "text-slate-600"
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                {cat.name}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1">
              <button
                onClick={() => { onDelete(todo.id); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── フォルダグループ（グループ表示用） ─────────────────────────
function TaskGroup({
  folderId, label, color, todos, doneTodos, selectedIds,
  onToggleSelect, onToggle, onDelete, onMove, onClearDone, categories,
}: {
  folderId: string | null; label: string; color?: string;
  todos: Todo[]; doneTodos: Todo[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, categoryId: string | null) => void;
  onClearDone: () => void;
  categories: Category[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sectionId = `section-${folderId ?? "null"}`;
  const { isOver, setNodeRef } = useDroppable({ id: sectionId });
  return (
    <div className="mb-5">
      {/* フォルダヘッダー */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color ?? "#cbd5e1" }} />
        <span className="text-sm font-semibold text-slate-700 flex-1 text-left">{label}</span>
        <span className="text-xs text-slate-400 tabular-nums">{todos.length}件</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-1.5 ml-4">
          {/* アクティブタスク */}
          <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {todos.length === 0 ? (
              // 空のときだけドロップゾーン（SortableContextと競合しない）
              <div
                ref={setNodeRef}
                className={`text-center py-4 text-xs rounded-xl border-2 border-dashed transition-colors ${
                  isOver
                    ? "border-indigo-300 text-indigo-400 bg-indigo-50"
                    : "border-slate-200 text-slate-300"
                }`}
              >
                ここにドロップ
              </div>
            ) : (
              <div className="space-y-2">
                {todos.map(todo => (
                  <SortableTodoItem
                    key={todo.id} todo={todo}
                    isSelected={selectedIds.has(todo.id)}
                    onToggleSelect={onToggleSelect}
                    onToggle={onToggle} onDelete={onDelete}
                    onMove={onMove} categories={categories}
                  />
                ))}
                {/* 非空セクションの末尾ドロップゾーン（小さく目立たない） */}
                <div
                  ref={setNodeRef}
                  className={`h-2 rounded transition-colors ${isOver ? "bg-indigo-100" : ""}`}
                />
              </div>
            )}
          </SortableContext>

          {/* 完了済みタスク */}
          {doneTodos.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs text-slate-400">完了済み（{doneTodos.length}件）</span>
                <button
                  onClick={onClearDone}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  削除
                </button>
              </div>
              <div className="space-y-2">
                {doneTodos.map(todo => (
                  <SortableTodoItem
                    key={todo.id} todo={todo}
                    isSelected={selectedIds.has(todo.id)}
                    onToggleSelect={onToggleSelect}
                    onToggle={onToggle} onDelete={onDelete}
                    onMove={onMove} categories={categories}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [input, setInput] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(true); // activeCategoryId===nullのとき true
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const draggingRef = useRef(false);

  const load = useMemo(() => async () => {
    const [{ data: t, error: te }, { data: c, error: ce }] = await Promise.all([
      supabase.from("todos").select("*").eq("team_id", teamId).order("order_index"),
      supabase.from("categories").select("*").eq("team_id", teamId).order("order_index"),
    ]);
    if (te?.message) console.error("todos fetch error:", te.message, te.code);
    if (ce?.message) console.error("categories fetch error:", ce.message, ce.code);
    if (t !== null) setTodos(t);
    if (c !== null) setCategories(c);
  }, [supabase, teamId]);

  // ドラッグ中はリアルタイムの再ロードを遅延させてちらつきを防ぐ
  const loadSafe = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return () => {
      if (draggingRef.current) {
        clearTimeout(timer);
        timer = setTimeout(load, 500);
      } else {
        load();
      }
    };
  }, [load]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`team-${teamId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, loadSafe)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, loadSafe)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, loadSafe, supabase, teamId]);

  // ポーリング：リアルタイムが届かない場合の保険（4秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!draggingRef.current) load();
    }, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setShowBulkMenu(false);
    };
    if (showBulkMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showBulkMenu]);

  // 全アクティブタスク（完了していない）
  const allActiveTodos = todos.filter(t => !t.done).sort((a, b) => a.order_index - b.order_index);

  // 単一フォルダ表示用
  const filteredActiveTodos = activeCategoryId === null
    ? allActiveTodos
    : allActiveTodos.filter(t => t.category_id === activeCategoryId);

  // 完了済み（全件）
  const allDoneTodos = todos
    .filter(t => t.done)
    .sort((a, b) => new Date(b.done_at!).getTime() - new Date(a.done_at!).getTime());

  // 単一フォルダ表示用の完了済み
  const doneTodos = activeCategoryId === null
    ? allDoneTodos
    : allDoneTodos.filter(t => t.category_id === activeCategoryId);

  // フォルダ別グループ（完了済みも含む）
  const groups = [
    { folderId: null, label: "未分類", color: undefined,
      todos: allActiveTodos.filter(t => t.category_id === null),
      doneTodos: allDoneTodos.filter(t => t.category_id === null) },
    ...categories.map(cat => ({
      folderId: cat.id, label: cat.name, color: cat.color,
      todos: allActiveTodos.filter(t => t.category_id === cat.id),
      doneTodos: allDoneTodos.filter(t => t.category_id === cat.id),
    })),
  ];

  const folderCount = (catId: string | null) =>
    catId === null
      ? allActiveTodos.filter(t => t.category_id === null).length
      : allActiveTodos.filter(t => t.category_id === catId).length;

  // ── アクション ────────────────────────────────────────────
  const addTodo = async () => {
    if (!input.trim()) return;
    const targetCatId = showAllGroups ? null : activeCategoryId;
    const sameFolder = allActiveTodos.filter(t => t.category_id === targetCatId);
    const maxOrder = sameFolder.length > 0 ? Math.max(...sameFolder.map(t => t.order_index)) + 1 : 0;
    const newTodo: Todo = {
      id: crypto.randomUUID(), team_id: teamId, category_id: targetCatId,
      text: input.trim(), done: false, done_at: null,
      order_index: maxOrder, created_at: new Date().toISOString(),
    };
    setTodos(prev => [...prev, newTodo]);
    setInput("");
    const { error } = await supabase.from("todos").insert(newTodo);
    if (error) {
      console.error("addTodo error:", error);
      setTodos(prev => prev.filter(t => t.id !== newTodo.id));
    }
    load();
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const u = { ...todo, done: !todo.done, done_at: !todo.done ? new Date().toISOString() : null };
    setTodos(prev => prev.map(t => t.id === id ? u : t));
    const { error } = await supabase.from("todos").update({ done: u.done, done_at: u.done_at }).eq("id", id);
    if (error) console.error("toggleTodo error:", error);
    load();
  };

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) console.error("deleteTodo error:", error);
    load();
  };

  const moveTodo = async (id: string, categoryId: string | null) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, category_id: categoryId } : t));
    const { error } = await supabase.from("todos").update({ category_id: categoryId }).eq("id", id);
    if (error) console.error("moveTodo error:", error);
    load();
  };

  const bulkMove = async (categoryId: string | null) => {
    const ids = Array.from(selectedIds);
    setTodos(prev => prev.map(t => ids.includes(t.id) ? { ...t, category_id: categoryId } : t));
    setSelectedIds(new Set());
    const { error } = await supabase.from("todos").update({ category_id: categoryId }).in("id", ids);
    if (error) console.error("bulkMove error:", error);
    load();
  };

  const clearDone = async () => {
    const ids = doneTodos.map(t => t.id);
    setTodos(prev => prev.filter(t => !ids.includes(t.id)));
    if (ids.length > 0) {
      const { error } = await supabase.from("todos").delete().in("id", ids);
      if (error) console.error("clearDone error:", error);
    }
    load();
  };

  const clearDoneForFolder = async (folderId: string | null) => {
    const ids = allDoneTodos.filter(t => t.category_id === folderId).map(t => t.id);
    setTodos(prev => prev.filter(t => !ids.includes(t.id)));
    if (ids.length > 0) {
      const { error } = await supabase.from("todos").delete().in("id", ids);
      if (error) console.error("clearDoneForFolder error:", error);
    }
    load();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
    const newCat: Category = {
      id: crypto.randomUUID(), team_id: teamId,
      name: newCategoryName.trim(), color, order_index: categories.length,
    };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName("");
    setShowCategoryInput(false);
    const { error } = await supabase.from("categories").insert(newCat);
    if (error) {
      console.error("addCategory error:", error);
      setCategories(prev => prev.filter(c => c.id !== newCat.id));
    }
    load();
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTodos(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null } : t));
    if (activeCategoryId === id) { setActiveCategoryId(null); setShowAllGroups(true); }
    await supabase.from("categories").delete().eq("id", id);
    await supabase.from("todos").update({ category_id: null }).eq("category_id", id);
  };

  const handleDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    setActiveDragId(e.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    const activeTask = todos.find(t => t.id === active.id);
    if (!activeTask) return;

    // ドラッグしたタスクが複数選択に含まれているか
    const isBulk = selectedIds.has(active.id as string) && selectedIds.size > 1;

    // ① 左サイドバーのフォルダにドロップ
    if (overId.startsWith("cat-")) {
      const catId = overId === "cat-all" ? null : overId.replace("cat-", "");
      if (isBulk) { await bulkMove(catId); } else { await moveTodo(active.id as string, catId); }
      return;
    }

    // ② 空セクションにドロップ
    if (overId.startsWith("section-")) {
      const catId = overId === "section-null" ? null : overId.replace("section-", "");
      if (isBulk) { await bulkMove(catId); } else { await moveTodo(active.id as string, catId); }
      return;
    }

    // ③ 別タスクにドロップ
    const overTask = todos.find(t => t.id === overId);
    if (!overTask) return;

    if (activeTask.category_id !== overTask.category_id) {
      // 別フォルダ → 移動（一括 or 単体）
      if (isBulk) { await bulkMove(overTask.category_id); } else { await moveTodo(active.id as string, overTask.category_id); }
    } else {
      // 同フォルダ → 並び替え（単体のみ）
      const sameFolder = allActiveTodos.filter(t => t.category_id === activeTask.category_id);
      const oldIdx = sameFolder.findIndex(t => t.id === active.id);
      const newIdx = sameFolder.findIndex(t => t.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(sameFolder, oldIdx, newIdx);
      // order_index も更新してソートが元に戻らないようにする
      const reorderedWithIdx = reordered.map((t, i) => ({ ...t, order_index: i }));
      const updatedIds = new Set(reorderedWithIdx.map(t => t.id));
      setTodos(prev => [...reorderedWithIdx, ...prev.filter(t => !updatedIds.has(t.id))]);
      await Promise.all(reorderedWithIdx.map(t =>
        supabase.from("todos").update({ order_index: t.order_index }).eq("id", t.id)
      ));
    }
    draggingRef.current = false;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDragTodo = activeDragId ? todos.find(t => t.id === activeDragId) : null;
  const activeCategory = categories.find(c => c.id === activeCategoryId);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const sharedItemProps = {
    onToggleSelect: toggleSelect,
    onToggle: toggleTodo,
    onDelete: deleteTodo,
    onMove: moveTodo,
    categories,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">タスク管理</h1>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "コピーしました ✓" : "URLをコピー"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4">
            {/* ── フォルダサイドバー（PC） ── */}
            <aside className="hidden sm:flex flex-col w-44 flex-shrink-0 gap-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">フォルダ</p>
              <DroppableFolder
                id="cat-all" label="すべて" count={allActiveTodos.length}
                isActive={showAllGroups}
                onClick={() => { setActiveCategoryId(null); setShowAllGroups(true); }}
              />
              {categories.map(cat => (
                <DroppableFolder
                  key={cat.id} id={`cat-${cat.id}`}
                  label={cat.name} color={cat.color} count={folderCount(cat.id)}
                  isActive={!showAllGroups && activeCategoryId === cat.id}
                  onClick={() => { setActiveCategoryId(cat.id); setShowAllGroups(false); }}
                  onDelete={() => deleteCategory(cat.id)}
                />
              ))}
              <div className="mt-2">
                {showCategoryInput ? (
                  <div className="flex flex-col gap-1">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") addCategory();
                        if (e.key === "Escape") { setShowCategoryInput(false); setNewCategoryName(""); }
                      }}
                      placeholder="フォルダ名"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex gap-1">
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={addCategory}
                        className="flex-1 px-2 py-1 text-xs bg-slate-800 text-white rounded-lg"
                      >追加</button>
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg text-slate-500"
                      >✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCategoryInput(true)}
                    className="flex items-center gap-1.5 px-3 py-2 w-full rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    フォルダを追加
                  </button>
                )}
              </div>
            </aside>

            {/* ── タスクエリア ── */}
            <div className="flex-1 min-w-0">
              {/* モバイル：フォルダタブ */}
              <div className="flex sm:hidden gap-2 mb-4 overflow-x-auto pb-1">
                <DroppableFolder
                  id="cat-all" label="すべて" count={allActiveTodos.length}
                  isActive={showAllGroups}
                  onClick={() => { setActiveCategoryId(null); setShowAllGroups(true); }}
                />
                {categories.map(cat => (
                  <DroppableFolder
                    key={cat.id} id={`cat-${cat.id}`} label={cat.name}
                    color={cat.color} count={folderCount(cat.id)}
                    isActive={!showAllGroups && activeCategoryId === cat.id}
                    onClick={() => { setActiveCategoryId(cat.id); setShowAllGroups(false); }}
                    onDelete={() => deleteCategory(cat.id)}
                  />
                ))}
                {showCategoryInput ? (
                  <div className="flex gap-1 flex-shrink-0 items-center">
                    <input
                      autoFocus value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") addCategory();
                        if (e.key === "Escape") { setShowCategoryInput(false); setNewCategoryName(""); }
                      }}
                      placeholder="フォルダ名"
                      className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button onMouseDown={e => e.preventDefault()} onClick={addCategory}
                      className="px-2 py-1.5 text-xs bg-slate-800 text-white rounded-lg whitespace-nowrap">追加</button>
                    <button onMouseDown={e => e.preventDefault()}
                      onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }}
                      className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowCategoryInput(true)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap flex-shrink-0">
                    ＋フォルダ
                  </button>
                )}
              </div>

              {/* 一括操作バー */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
                  <span className="text-indigo-700 font-medium">{selectedIds.size}件選択中</span>
                  <div ref={bulkMenuRef} className="relative ml-auto">
                    <button
                      onClick={() => setShowBulkMenu(v => !v)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                    >
                      フォルダに移動
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showBulkMenu && (
                      <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 w-40 overflow-hidden">
                        <button onClick={() => { bulkMove(null); setShowBulkMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />未分類
                        </button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => { bulkMove(cat.id); setShowBulkMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* 入力フォーム */}
              <div className="flex gap-2 mb-5">
                <input
                  type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTodo()}
                  placeholder={
                    !showAllGroups && activeCategory
                      ? `「${activeCategory.name}」にタスクを追加...`
                      : "新しいタスクを入力..."
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm shadow-sm"
                />
                <button
                  onClick={addTodo} disabled={!input.trim()}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >追加</button>
              </div>

              {/* ── グループ表示（すべて） ── */}
              {showAllGroups ? (
                <div>
                  {allActiveTodos.length === 0 && doneTodos.length === 0 ? (
                    <div className="text-center py-16 text-slate-300">
                      <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm">タスクを追加してみましょう</p>
                    </div>
                  ) : (
                    groups.map(group => (
                      <TaskGroup
                        key={group.folderId ?? "uncategorized"}
                        folderId={group.folderId}
                        label={group.label}
                        color={group.color}
                        todos={group.todos}
                        doneTodos={group.doneTodos}
                        selectedIds={selectedIds}
                        onClearDone={() => clearDoneForFolder(group.folderId)}
                        {...sharedItemProps}
                      />
                    ))
                  )}
                </div>
              ) : (
                /* ── 単一フォルダ表示 ── */
                <SortableContext items={filteredActiveTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {filteredActiveTodos.length === 0 && doneTodos.length === 0 && (
                      <div className="text-center py-16 text-slate-300">
                        <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm">タスクを追加してみましょう</p>
                      </div>
                    )}
                    {filteredActiveTodos.map(todo => (
                      <SortableTodoItem key={todo.id} todo={todo} isSelected={selectedIds.has(todo.id)} {...sharedItemProps} />
                    ))}
                  </div>
                </SortableContext>
              )}

              {/* 完了済み（単一フォルダ表示のみ） */}
              {!showAllGroups && doneTodos.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">完了済み（{doneTodos.length}件）</span>
                    <button onClick={clearDone} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                      すべて削除
                    </button>
                  </div>
                  <div className="space-y-2">
                    {doneTodos.map(todo => (
                      <SortableTodoItem key={todo.id} todo={todo} isSelected={selectedIds.has(todo.id)} {...sharedItemProps} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ドラッグ中ゴースト */}
          <DragOverlay>
            {activeDragTodo && (
              selectedIds.has(activeDragTodo.id) && selectedIds.size > 1 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 border border-indigo-500 shadow-xl text-sm text-white opacity-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {selectedIds.size}件を移動中
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-indigo-300 shadow-xl text-sm text-slate-700 opacity-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {activeDragTodo.text}
                </div>
              )
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
