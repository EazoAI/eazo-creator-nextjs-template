"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="group">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={busy}
          aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-muted-foreground/40 transition-colors hover:border-primary disabled:opacity-40"
          style={
            todo.completed
              ? { backgroundColor: "hsl(var(--primary))", borderColor: "hsl(var(--primary))" }
              : {}
          }
        >
          {todo.completed && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
        </button>

        {/* Title / edit field */}
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="h-7 flex-1 text-sm"
          />
        ) : (
          <span
            className={`flex-1 text-sm leading-snug ${
              todo.completed ? "text-muted-foreground line-through" : ""
            }`}
          >
            {todo.title}
          </span>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleSave}
                disabled={busy}
                aria-label="Save"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleCancel}
                disabled={busy}
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => { setDraft(todo.title); setEditing(true); }}
                disabled={busy}
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={handleDelete}
                disabled={busy}
                aria-label="Delete"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
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
      <Input
        placeholder="Add a new todo…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !value.trim()} className="shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        <span className="ml-1.5">Add</span>
      </Button>
    </form>
  );
}
