"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { AddTodoForm, TodoItem } from "./todo-item";
import type { Todo } from "@/lib/db/schema/todos";
import { getTodos, createTodo, updateTodo, deleteTodo } from "@/lib/api";

export function TodoListPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    try {
      setTodos(await getTodos());
    } catch {
      toast.error("Failed to load todos");
    }
  }, []);

  useEffect(() => {
    fetchTodos().finally(() => setLoading(false));
  }, [fetchTodos]);

  async function handleAdd(title: string) {
    try {
      const created = await createTodo(title);
      setTodos((prev) => [created, ...prev]);
    } catch {
      toast.error("Failed to add todo");
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      const updated = await updateTodo(id, { completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      toast.error("Failed to update todo");
    }
  }

  async function handleRename(id: number, title: string) {
    try {
      const updated = await updateTodo(id, { title });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      toast.error("Failed to rename todo");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete todo");
    }
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
