"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X, Plus, Loader2 } from "lucide-react";
import type { Todo } from "@/lib/db/schema/todos";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onRename, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    await onToggle(todo.id, !todo.completed);
    setBusy(false);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === todo.title) {
      setEditing(false);
      setDraft(todo.title);
      return;
    }
    setBusy(true);
    await onRename(todo.id, trimmed);
    setEditing(false);
    setBusy(false);
  }

  function handleCancel() {
    setDraft(todo.title);
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await onDelete(todo.id);
  }

  return (
    <div className="group flex items-center gap-3 rounded-[14px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.09)] transition-all duration-200 hover:bg-white/86 hover:shadow-[0_14px_32px_rgba(15,23,42,0.11)]">
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={busy}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-950/25 transition-all duration-200 hover:border-[#EE5C2A]/60 disabled:opacity-40"
        style={
          todo.completed
            ? { background: "linear-gradient(180deg,#F47A42 0%,#EE5C2A 100%)", borderColor: "#EE5C2A" }
            : {}
        }
      >
        {todo.completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>

      {/* Title / edit field */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="h-7 flex-1 rounded-[8px] border border-white/70 bg-white/72 px-2.5 text-sm text-slate-950/80 shadow-[0_4px_12px_rgba(15,23,42,0.07)] outline-none focus:border-[#EE5C2A]/48 focus:ring-2 focus:ring-[#EE5C2A]/12"
        />
      ) : (
        <span
          className={`flex-1 text-[14px] leading-snug transition-colors duration-200 ${
            todo.completed ? "text-slate-950/38 line-through" : "text-slate-950/80"
          }`}
        >
          {todo.title}
        </span>
      )}

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={busy}
              aria-label="Save"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/45 transition-colors hover:bg-white/80 hover:text-[#EE5C2A] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              aria-label="Cancel"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/45 transition-colors hover:bg-white/80 hover:text-slate-950/72 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setDraft(todo.title); setEditing(true); }}
              disabled={busy}
              aria-label="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white/80 hover:text-slate-950/72"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              aria-label="Delete"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface AddTodoFormProps {
  onAdd: (title: string) => Promise<void>;
}

export function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    await onAdd(trimmed);
    setValue("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        placeholder="Add a new todo…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        className="h-[48px] flex-1 rounded-[14px] border border-white/70 bg-white/72 px-4 text-[15px] text-slate-950/80 shadow-[0_12px_28px_rgba(15,23,42,0.09)] transition-all duration-200 placeholder:text-slate-950/40 focus:border-[#EE5C2A]/48 focus:bg-white/86 focus:ring-4 focus:ring-[#EE5C2A]/12 focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="h-[48px] rounded-[14px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] px-5 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(238,92,42,0.32)] transition-all duration-200 hover:brightness-105 hover:shadow-[0_14px_30px_rgba(238,92,42,0.36)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
    </form>
  );
}
