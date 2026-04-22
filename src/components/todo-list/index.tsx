"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { AddTodoForm, TodoItem } from "./todo-item";
import type { Todo } from "@/lib/db/schema/todos";
import { fetchWithAuth } from "@/utils/fetch-with-auth";

export function TodoListPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    const res = await fetchWithAuth("/api/todos");
    if (!res.ok) { toast.error("Failed to load todos"); return; }
    setTodos(await res.json());
  }, []);

  useEffect(() => {
    fetchTodos().finally(() => setLoading(false));
  }, [fetchTodos]);

  async function handleAdd(title: string) {
    const res = await fetchWithAuth("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { toast.error("Failed to add todo"); return; }
    const created: Todo = await res.json();
    setTodos((prev) => [created, ...prev]);
  }

  async function handleToggle(id: number, completed: boolean) {
    const res = await fetchWithAuth(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) { toast.error("Failed to update todo"); return; }
    const updated: Todo = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleRename(id: number, title: string) {
    const res = await fetchWithAuth(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { toast.error("Failed to rename todo"); return; }
    const updated: Todo = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDelete(id: number) {
    const res = await fetchWithAuth(`/api/todos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete todo"); return; }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const done = todos.filter((t) => t.completed).length;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Todo List</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {done} of {todos.length} completed
            </p>
          )}
        </div>
      </div>

      {/* Add form */}
      <div className="mb-6">
        <AddTodoForm onAdd={handleAdd} />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : todos.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">No todos yet. Add one above!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
