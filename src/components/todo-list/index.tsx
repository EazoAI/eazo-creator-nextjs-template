"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { auth, storage, memory } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { AddTodoForm, TodoItem } from "./todo-item";
import { AiAnalysisPanel } from "./ai-analysis-panel";
import type { Todo } from "@/lib/db/schema/todos";
import { getTodos, createTodo, updateTodo, deleteTodo, attachImage, removeAttachment } from "@/lib/api";

export function TodoListPage() {
  const user = useEazo((s) => s.auth.user);
  const authLoading = useEazo((s) => s.auth.loading);
  const authInitialized = !authLoading;

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      setTodos(await getTodos());
    } catch {
      toast.error("Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authInitialized && user) {
      fetchTodos();
    }
  }, [authInitialized, user, fetchTodos]);

  async function handleAdd(title: string) {
    try {
      const created = await createTodo(title);
      memory.reportAction({
        content: `User created todo: "${title}"`,
        event_type: "create",
        page: "todo_list",
        metadata: { type: "create_todo", todo: { id: created.id, title } },
      }).catch(() => {});
      setTodos((prev) => [created, ...prev]);
    } catch {
      toast.error("Failed to add todo");
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      const updated = await updateTodo(id, { completed });
      memory.reportAction({
        content: `User marked todo as ${completed ? "completed" : "incomplete"}`,
        event_type: completed ? "complete" : "reopen",
        page: "todo_list",
        metadata: { type: completed ? "complete_todo" : "reopen_todo", todo_id: id },
      }).catch(() => {});
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      toast.error("Failed to update todo");
    }
  }

  async function handleRename(id: number, title: string) {
    try {
      const updated = await updateTodo(id, { title });
      memory.reportAction({
        content: `User renamed todo to: "${title}"`,
        event_type: "rename",
        page: "todo_list",
        metadata: { type: "rename_todo", todo_id: id, new_title: title },
      }).catch(() => {});
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      toast.error("Failed to rename todo");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      memory.reportAction({
        content: "User deleted a todo",
        event_type: "delete",
        page: "todo_list",
        metadata: { type: "delete_todo", todo_id: id },
      }).catch(() => {});
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete todo");
    }
  }

  async function handleAttach(id: number, file: File) {
    try {
      // Upload directly to S3 via SDK presigned URL
      const { key, url } = await storage.upload(`todos/${id}/${file.name}`, file);
      // Persist the S3 key and GET URL in the database
      const updated = await attachImage(id, key, url);
      memory.reportAction({
        content: `User attached image "${file.name}" to todo`,
        event_type: "attach",
        page: "todo_list",
        metadata: { type: "attach_image", todo_id: id, file_name: file.name, file_size: file.size },
      }).catch(() => {});
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success("Image attached");
    } catch (err) {
      console.error(err);
      toast.error("Failed to attach image");
    }
  }

  async function handleRemoveAttachment(id: number) {
    try {
      const updated = await removeAttachment(id);
      memory.reportAction({
        content: "User removed attachment from todo",
        event_type: "remove_attachment",
        page: "todo_list",
        metadata: { type: "remove_attachment", todo_id: id },
      }).catch(() => {});
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      toast.error("Failed to remove attachment");
    }
  }

  const done = todos.filter((t) => t.completed).length;

  // Auth not yet resolved — show spinner
  if (!authInitialized) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#EE5C2A]" />
      </div>
    );
  }

  // Not logged in — prompt to sign in
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] shadow-[0_8px_20px_rgba(238,92,42,0.32)]">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-950/90">Todo List</h1>
        </div>

        <div className="rounded-[18px] border border-white/70 bg-white/60 py-14 text-center shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-950/5">
            <LogIn className="h-5 w-5 text-slate-950/40" />
          </div>
          <p className="mb-1 text-[15px] font-semibold text-slate-950/80">Sign in to view your todos</p>
          <p className="mb-6 text-[13px] font-medium text-slate-950/40">Your tasks are waiting for you</p>
          <button
            onClick={() => {
              auth.login().catch(() => undefined);
            }}
            className="h-[44px] rounded-[14px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] px-8 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(238,92,42,0.30)] transition-all duration-200 hover:brightness-105 hover:shadow-[0_10px_24px_rgba(238,92,42,0.36)]"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] shadow-[0_8px_20px_rgba(238,92,42,0.32)]">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-950/90">Todo List</h1>
            {!loading && (
              <p className="text-[13px] font-medium text-slate-950/45">
                {done} of {todos.length} completed
              </p>
            )}
          </div>
          {todos.length > 0 && !loading && (
            <button
              onClick={() => setShowAiPanel((v) => !v)}
              aria-label="Analyze with AI"
              className={`flex h-9 items-center gap-1.5 rounded-[12px] px-3.5 text-[13px] font-semibold transition-all duration-200 ${
                showAiPanel
                  ? "bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] text-white shadow-[0_6px_16px_rgba(238,92,42,0.32)]"
                  : "border border-white/70 bg-white/72 text-slate-950/60 shadow-[0_4px_12px_rgba(15,23,42,0.07)] hover:bg-white/86 hover:text-[#EE5C2A]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!loading && todos.length > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-950/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#F47A42_0%,#EE5C2A_100%)] transition-all duration-500"
              style={{ width: `${Math.round((done / todos.length) * 100)}%` }}
            />
          </div>
        )}

        {/* AI analysis panel */}
        {showAiPanel && (
          <AiAnalysisPanel todoCount={todos.length} onClose={() => setShowAiPanel(false)} />
        )}
      </div>

      {/* Add form */}
      <div className="mb-5">
        <AddTodoForm onAdd={handleAdd} />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#EE5C2A]" />
        </div>
      ) : todos.length === 0 ? (
        <div className="rounded-[18px] border border-white/70 bg-white/60 py-16 text-center shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-950/20" />
          <p className="text-[13px] font-medium text-slate-950/40">No todos yet. Add one above!</p>
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
              onAttach={handleAttach}
              onRemoveAttachment={handleRemoveAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
