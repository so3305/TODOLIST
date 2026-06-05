"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CollisionDetection,
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase";
import type { Category, Todo } from "@/lib/types";

const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#84cc16",
];

// ── 「すべて」ボタン ────────────────────────────────────────
function AllFolderButton({ count, isActive, onClick }: {
  count: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center justify-between px-3 py-2 rounded-lg transition-all select-none ${
        isActive ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-600"
      }`}
    >
      <span className="text-xs font-medium">すべて</span>
      <span className={`text-xs tabular-nums ml-2 ${isActive ? "text-slate-300" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

// ── フォルダメニュー ─────────────────────────────────────────
function FolderMenu({
  category, isActive, onEdit, onColorChange, onDelete,
}: {
  category: Category; isActive: boolean;
  onEdit: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", h);
      document.addEventListener("touchstart", h);
    }
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, [showMenu]);

  const confirmEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== category.name) onEdit(category.id, trimmed);
    setIsEditing(false);
  };

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowMenu(v => !v);
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={editName}
        onChange={e => setEditName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setIsEditing(false); }}
        onBlur={confirmEdit}
        onClick={e => e.stopPropagation()}
        className={`w-16 bg-transparent text-xs font-medium focus:outline-none border-b ${
          isActive ? "border-white text-white" : "border-slate-400 text-slate-700"
        }`}
      />
    );
  }

  return (
    <div ref={containerRef} className="flex-shrink-0">
      <button
        ref={triggerRef}
        onPointerDown={e => e.stopPropagation()}
        onClick={openMenu}
        className={`p-1 rounded ${isActive ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
        title="フォルダを編集"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {showMenu && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] py-1 w-44 overflow-hidden"
          style={{ top: menuPos.top, right: menuPos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditName(category.name); setIsEditing(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            名前を変更
          </button>
          <div className="px-3 py-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">色を変更</p>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { onColorChange(category.id, c); setShowMenu(false); }}
                  className={`w-5 h-5 rounded-full hover:scale-125 transition-transform ${
                    category.color === c ? "ring-2 ring-offset-1 ring-slate-500" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100">
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              削除
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── フォルダ（タスクと同じドラッグパターン） ────────────────────
function SortableFolder({
  category, isActive, taskCount, onClick, onDelete, onEdit, onColorChange,
}: {
  category: Category; isActive: boolean; taskCount: number;
  onClick: () => void; onDelete: () => void;
  onEdit: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-all select-none flex-shrink-0 ${
        isActive ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-600"
      }`}
    >
      {/* ドラッグハンドル（タスクと同じパターン） */}
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className={`cursor-grab active:cursor-grabbing flex-shrink-0 touch-none p-0.5 -m-0.5 ${
          isActive ? "text-slate-400" : "text-slate-300 hover:text-slate-500"
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: category.color }} />
      <span className="truncate text-xs font-medium flex-1 min-w-0">{category.name}</span>
      <span className={`text-xs tabular-nums flex-shrink-0 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
        {taskCount}
      </span>
      <FolderMenu
        category={category} isActive={isActive}
        onEdit={onEdit} onColorChange={onColorChange} onDelete={onDelete}
      />
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

      <span className={`flex-1 text-sm truncate ${todo.done ? "line-through text-slate-400" : "text-slate-700"}`}>
        {todo.text}
      </span>

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

// ── フォルダグループ ─────────────────────────────────────────
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
          <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {todos.length === 0 ? (
              <div
                ref={setNodeRef}
                className={`text-center py-4 text-xs rounded-xl border-2 border-dashed transition-colors ${
                  isOver ? "border-indigo-300 text-indigo-400 bg-indigo-50" : "border-slate-200 text-slate-300"
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
                <div ref={setNodeRef} className={`h-2 rounded transition-colors ${isOver ? "bg-indigo-100" : ""}`} />
              </div>
            )}
          </SortableContext>
          {doneTodos.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs text-slate-400">完了済み（{doneTodos.length}件）</span>
                <button onClick={onClearDone} className="text-xs text-slate-400 hover:text-red-400 transition-colors">削除</button>
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

type Snapshot = { todos: Todo[]; categories: Category[] };

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [input, setInput] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const categoriesRef = useRef(categories);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);

  const undoStackRef = useRef<Snapshot[]>([]);
  const redoStackRef = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const loadSafe = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return () => {
      if (draggingRef.current) {
        clearTimeout(timer);
        timer = setTimeout(load, 800);
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

  useEffect(() => {
    const interval = setInterval(() => { if (!draggingRef.current) load(); }, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setShowBulkMenu(false);
    };
    if (showBulkMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showBulkMenu]);

  // ── Undo/Redo ─────────────────────────────────────────────
  const saveSnapshot = (snapshotTodos: Todo[], snapshotCats: Category[]) => {
    undoStackRef.current = [...undoStackRef.current.slice(-49), { todos: snapshotTodos, categories: snapshotCats }];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const applySnapshot = async (snapshot: Snapshot, oldTodos: Todo[], oldCats: Category[]) => {
    setTodos(snapshot.todos);
    setCategories(snapshot.categories);
    const oldTodoMap = new Map(oldTodos.map(t => [t.id, t]));
    const newTodoMap = new Map(snapshot.todos.map(t => [t.id, t]));
    const oldCatMap = new Map(oldCats.map(c => [c.id, c]));
    const newCatMap = new Map(snapshot.categories.map(c => [c.id, c]));
    const todoDel = oldTodos.filter(t => !newTodoMap.has(t.id));
    const todoIns = snapshot.todos.filter(t => !oldTodoMap.has(t.id));
    const todoUpd = snapshot.todos.filter(t => { const o = oldTodoMap.get(t.id); return o && JSON.stringify(o) !== JSON.stringify(t); });
    const catDel = oldCats.filter(c => !newCatMap.has(c.id));
    const catIns = snapshot.categories.filter(c => !oldCatMap.has(c.id));
    const catUpd = snapshot.categories.filter(c => { const o = oldCatMap.get(c.id); return o && JSON.stringify(o) !== JSON.stringify(c); });
    if (todoDel.length > 0) await supabase.from("todos").delete().in("id", todoDel.map(t => t.id));
    if (todoIns.length > 0) await supabase.from("todos").insert(todoIns);
    for (const t of todoUpd) await supabase.from("todos").update(t).eq("id", t.id);
    if (catDel.length > 0) await supabase.from("categories").delete().in("id", catDel.map(c => c.id));
    if (catIns.length > 0) await supabase.from("categories").insert(catIns);
    for (const c of catUpd) await supabase.from("categories").update(c).eq("id", c.id);
  };

  const undo = async () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    const curr = { todos, categories };
    redoStackRef.current = [...redoStackRef.current, curr];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    await applySnapshot(prev, todos, categories);
  };

  const redo = async () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    const curr = { todos, categories };
    undoStackRef.current = [...undoStackRef.current, curr];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    await applySnapshot(next, todos, categories);
  };

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => { undoRef.current = undo; });
  useEffect(() => { redoRef.current = redo; });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redoRef.current(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── データ計算 ─────────────────────────────────────────────
  const allActiveTodos = todos.filter(t => !t.done).sort((a, b) => a.order_index - b.order_index);
  const filteredActiveTodos = activeCategoryId === null ? allActiveTodos : allActiveTodos.filter(t => t.category_id === activeCategoryId);
  const allDoneTodos = todos.filter(t => t.done).sort((a, b) => new Date(b.done_at!).getTime() - new Date(a.done_at!).getTime());
  const doneTodos = activeCategoryId === null ? allDoneTodos : allDoneTodos.filter(t => t.category_id === activeCategoryId);
  const groups = [
    { folderId: null, label: "未分類", color: undefined, todos: allActiveTodos.filter(t => t.category_id === null), doneTodos: allDoneTodos.filter(t => t.category_id === null) },
    ...categories.map(cat => ({ folderId: cat.id, label: cat.name, color: cat.color, todos: allActiveTodos.filter(t => t.category_id === cat.id), doneTodos: allDoneTodos.filter(t => t.category_id === cat.id) })),
  ];
  const folderCount = (catId: string | null) => catId === null ? allActiveTodos.filter(t => t.category_id === null).length : allActiveTodos.filter(t => t.category_id === catId).length;

  // ── カスタムコリジョン：フォルダドラッグ時はフォルダのみ対象 ──
  const collisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);
    const cats = categoriesRef.current;
    if (cats.some(c => c.id === activeId)) {
      const catIdSet = new Set(cats.map(c => c.id));
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(c => catIdSet.has(String(c.id))),
      });
    }
    return closestCenter(args);
  };

  // ── アクション ────────────────────────────────────────────
  const addTodo = async () => {
    if (!input.trim()) return;
    saveSnapshot(todos, categories);
    const targetCatId = showAllGroups ? null : activeCategoryId;
    const sameFolder = allActiveTodos.filter(t => t.category_id === targetCatId);
    const maxOrder = sameFolder.length > 0 ? Math.max(...sameFolder.map(t => t.order_index)) + 1 : 0;
    const newTodo: Todo = { id: crypto.randomUUID(), team_id: teamId, category_id: targetCatId, text: input.trim(), done: false, done_at: null, order_index: maxOrder, created_at: new Date().toISOString() };
    setTodos(prev => [...prev, newTodo]);
    setInput("");
    const { error } = await supabase.from("todos").insert(newTodo);
    if (error) { console.error("addTodo error:", error); setTodos(prev => prev.filter(t => t.id !== newTodo.id)); }
    load();
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    saveSnapshot(todos, categories);
    const u = { ...todo, done: !todo.done, done_at: !todo.done ? new Date().toISOString() : null };
    setTodos(prev => prev.map(t => t.id === id ? u : t));
    const { error } = await supabase.from("todos").update({ done: u.done, done_at: u.done_at }).eq("id", id);
    if (error) console.error("toggleTodo error:", error);
    load();
  };

  const deleteTodo = async (id: string) => {
    saveSnapshot(todos, categories);
    setTodos(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) console.error("deleteTodo error:", error);
    load();
  };

  const moveTodo = async (id: string, categoryId: string | null) => {
    saveSnapshot(todos, categories);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, category_id: categoryId } : t));
    await supabase.from("todos").update({ category_id: categoryId }).eq("id", id);
    load();
  };

  const bulkMove = async (categoryId: string | null) => {
    saveSnapshot(todos, categories);
    const ids = Array.from(selectedIds);
    setTodos(prev => prev.map(t => ids.includes(t.id) ? { ...t, category_id: categoryId } : t));
    setSelectedIds(new Set());
    await supabase.from("todos").update({ category_id: categoryId }).in("id", ids);
    load();
  };

  const clearDone = async () => {
    saveSnapshot(todos, categories);
    const ids = doneTodos.map(t => t.id);
    setTodos(prev => prev.filter(t => !ids.includes(t.id)));
    if (ids.length > 0) await supabase.from("todos").delete().in("id", ids);
    load();
  };

  const clearDoneForFolder = async (folderId: string | null) => {
    saveSnapshot(todos, categories);
    const ids = allDoneTodos.filter(t => t.category_id === folderId).map(t => t.id);
    setTodos(prev => prev.filter(t => !ids.includes(t.id)));
    if (ids.length > 0) await supabase.from("todos").delete().in("id", ids);
    load();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    saveSnapshot(todos, categories);
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
    const newCat: Category = { id: crypto.randomUUID(), team_id: teamId, name: newCategoryName.trim(), color, order_index: categories.length };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName("");
    setShowCategoryInput(false);
    const { error } = await supabase.from("categories").insert(newCat);
    if (error) { console.error("addCategory error:", error); setCategories(prev => prev.filter(c => c.id !== newCat.id)); }
    load();
  };

  const deleteCategory = async (id: string) => {
    saveSnapshot(todos, categories);
    setCategories(prev => prev.filter(c => c.id !== id));
    setTodos(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null } : t));
    if (activeCategoryId === id) { setActiveCategoryId(null); setShowAllGroups(true); }
    await supabase.from("categories").delete().eq("id", id);
    await supabase.from("todos").update({ category_id: null }).eq("category_id", id);
  };

  const editCategory = async (id: string, name: string) => {
    saveSnapshot(todos, categories);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    await supabase.from("categories").update({ name }).eq("id", id);
  };

  const updateCategoryColor = async (id: string, color: string) => {
    saveSnapshot(todos, categories);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    await supabase.from("categories").update({ color }).eq("id", id);
  };

  // ── ドラッグハンドラー（1つのDndContext） ─────────────────
  const handleDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      draggingRef.current = false;
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // フォルダの並び替え
    const folderOldIdx = categories.findIndex(c => c.id === activeId);
    if (folderOldIdx !== -1) {
      const folderNewIdx = categories.findIndex(c => c.id === overId);
      if (folderNewIdx !== -1 && folderOldIdx !== folderNewIdx) {
        saveSnapshot(todos, categories);
        const reordered = arrayMove(categories, folderOldIdx, folderNewIdx);
        setCategories(reordered);
        await Promise.all(reordered.map((c, i) =>
          supabase.from("categories").update({ order_index: i }).eq("id", c.id)
        ));
      }
      draggingRef.current = false;
      return;
    }

    // タスクの並び替え・移動
    const activeTask = todos.find(t => t.id === activeId);
    if (!activeTask) { draggingRef.current = false; return; }

    const isBulk = selectedIds.has(activeId) && selectedIds.size > 1;

    if (overId.startsWith("section-")) {
      const catId = overId === "section-null" ? null : overId.replace("section-", "");
      if (isBulk) await bulkMove(catId); else await moveTodo(activeId, catId);
      draggingRef.current = false;
      return;
    }

    const overTask = todos.find(t => t.id === overId);
    if (!overTask) { draggingRef.current = false; return; }

    if (activeTask.category_id !== overTask.category_id) {
      if (isBulk) await bulkMove(overTask.category_id); else await moveTodo(activeId, overTask.category_id);
    } else {
      const sameFolder = allActiveTodos.filter(t => t.category_id === activeTask.category_id);
      const oldIdx = sameFolder.findIndex(t => t.id === activeId);
      const newIdx = sameFolder.findIndex(t => t.id === overId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        saveSnapshot(todos, categories);
        const reordered = arrayMove(sameFolder, oldIdx, newIdx);
        const reorderedWithIdx = reordered.map((t, i) => ({ ...t, order_index: i }));
        const updatedIds = new Set(reorderedWithIdx.map(t => t.id));
        setTodos(prev => [...reorderedWithIdx, ...prev.filter(t => !updatedIds.has(t.id))]);
        await Promise.all(reorderedWithIdx.map(t => supabase.from("todos").update({ order_index: t.order_index }).eq("id", t.id)));
      }
    }
    draggingRef.current = false;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDragTodo = activeDragId ? todos.find(t => t.id === activeDragId) : null;
  const activeDragCategory = activeDragId ? categories.find(c => c.id === activeDragId) : null;
  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sharedItemProps = { onToggleSelect: toggleSelect, onToggle: toggleTodo, onDelete: deleteTodo, onMove: moveTodo, categories };

  const folderProps = (cat: Category) => ({
    category: cat,
    isActive: !showAllGroups && activeCategoryId === cat.id,
    taskCount: folderCount(cat.id),
    onClick: () => { if (selectedIds.size > 0) bulkMove(cat.id); else { setActiveCategoryId(cat.id); setShowAllGroups(false); } },
    onDelete: () => deleteCategory(cat.id),
    onEdit: editCategory,
    onColorChange: updateCategoryColor,
  });

  const folderList = (strategy: typeof verticalListSortingStrategy | typeof horizontalListSortingStrategy) => (
    <SortableContext items={categories.map(c => c.id)} strategy={strategy}>
      {categories.map(cat => <SortableFolder key={cat.id} {...folderProps(cat)} />)}
    </SortableContext>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-slate-800 hover:text-slate-600 transition-colors">タスク管理</a>
          <div className="flex items-center gap-1.5">
            <button onClick={undo} disabled={!canUndo} title="元に戻す (Ctrl+Z)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="hidden sm:inline">元に戻す</span>
            </button>
            <button onClick={redo} disabled={!canRedo} title="やり直し (Ctrl+Y)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
              <span className="hidden sm:inline">やり直し</span>
            </button>
            <button onClick={copyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{copied ? "コピーしました ✓" : "URLをコピー"}</span>
              <span className="sm:hidden">{copied ? "✓" : "URL"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4">

            {/* PC フォルダサイドバー */}
            <aside className="hidden sm:flex flex-col w-48 flex-shrink-0 gap-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">フォルダ</p>
              <AllFolderButton
                count={allActiveTodos.length} isActive={showAllGroups}
                onClick={() => { if (selectedIds.size > 0) bulkMove(null); else { setActiveCategoryId(null); setShowAllGroups(true); } }}
              />
              {folderList(verticalListSortingStrategy)}
              <div className="mt-2">
                {showCategoryInput ? (
                  <div className="flex flex-col gap-1">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setShowCategoryInput(false); setNewCategoryName(""); } }}
                      placeholder="フォルダ名"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex gap-1">
                      <button onMouseDown={e => e.preventDefault()} onClick={addCategory} className="flex-1 px-2 py-1 text-xs bg-slate-800 text-white rounded-lg">追加</button>
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }} className="px-2 py-1 text-xs border border-slate-200 rounded-lg text-slate-500">✕</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCategoryInput(true)} className="flex items-center gap-1.5 px-3 py-2 w-full rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    フォルダを追加
                  </button>
                )}
              </div>
            </aside>

            {/* タスクエリア */}
            <div className="flex-1 min-w-0">
              {/* モバイル：フォルダタブ */}
              <div className="flex sm:hidden gap-2 mb-4 overflow-x-auto pb-1">
                <AllFolderButton
                  count={allActiveTodos.length} isActive={showAllGroups}
                  onClick={() => { if (selectedIds.size > 0) bulkMove(null); else { setActiveCategoryId(null); setShowAllGroups(true); } }}
                />
                {folderList(horizontalListSortingStrategy)}
                {showCategoryInput ? (
                  <div className="flex gap-1 flex-shrink-0 items-center">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setShowCategoryInput(false); setNewCategoryName(""); } }}
                      placeholder="フォルダ名" className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button onMouseDown={e => e.preventDefault()} onClick={addCategory} className="px-2 py-1.5 text-xs bg-slate-800 text-white rounded-lg whitespace-nowrap">追加</button>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowCategoryInput(true)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap flex-shrink-0">＋フォルダ</button>
                )}
              </div>

              {/* 一括操作バー */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
                  <span className="text-indigo-700 font-medium">{selectedIds.size}件選択中</span>
                  <div ref={bulkMenuRef} className="relative ml-auto">
                    <button onClick={() => setShowBulkMenu(v => !v)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">
                      フォルダに移動
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showBulkMenu && (
                      <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 w-40 overflow-hidden">
                        <button onClick={() => { bulkMove(null); setShowBulkMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />未分類
                        </button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => { bulkMove(cat.id); setShowBulkMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />{cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {/* 入力フォーム */}
              <div className="flex gap-2 mb-5">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()}
                  placeholder={!showAllGroups && activeCategory ? `「${activeCategory.name}」にタスクを追加...` : "新しいタスクを入力..."}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm shadow-sm"
                />
                <button onClick={addTodo} disabled={!input.trim()} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">追加</button>
              </div>

              {/* タスク一覧 */}
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
                      <TaskGroup key={group.folderId ?? "uncategorized"} folderId={group.folderId} label={group.label} color={group.color}
                        todos={group.todos} doneTodos={group.doneTodos} selectedIds={selectedIds}
                        onClearDone={() => clearDoneForFolder(group.folderId)} {...sharedItemProps} />
                    ))
                  )}
                </div>
              ) : (
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

              {/* 完了済み */}
              {!showAllGroups && doneTodos.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">完了済み（{doneTodos.length}件）</span>
                    <button onClick={clearDone} className="text-xs text-slate-400 hover:text-red-400 transition-colors">すべて削除</button>
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
            {activeDragCategory && (
              <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-white border border-slate-300 shadow-xl opacity-95 select-none">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: activeDragCategory.color }} />
                <span className="text-xs font-medium">{activeDragCategory.name}</span>
              </div>
            )}
            {activeDragTodo && !activeDragCategory && (
              selectedIds.has(activeDragTodo.id) && selectedIds.size > 1 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 border border-indigo-500 shadow-xl text-sm text-white opacity-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />{selectedIds.size}件を移動中
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-indigo-300 shadow-xl text-sm text-slate-700 opacity-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />{activeDragTodo.text}
                </div>
              )
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
