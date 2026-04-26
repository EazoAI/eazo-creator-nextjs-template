"use client";

import { useRef, useState } from "react";
import { Trash2, Pencil, Check, X, Plus, Loader2, Paperclip, ImageOff, Share2 } from "lucide-react";
import Image from "next/image";
import { share } from "@eazo/sdk";
import { toast } from "sonner";
import type { Todo } from "@/lib/db/schema/todos";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAttach: (id: number, file: File) => Promise<void>;
  onRemoveAttachment: (id: number) => Promise<void>;
}

export function TodoItem({
  todo,
  onToggle,
  onRename,
  onDelete,
  onAttach,
  onRemoveAttachment,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onAttach(todo.id, file);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected after removal
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAttachment(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    await onRemoveAttachment(todo.id);
    setBusy(false);
  }

  // Hands the todo's title (and attachment, if any) to the platform via
  // `share.compose`. On Eazo mobile this opens the native compose page with
  // an AI-drafted post; in a desktop browser the SDK shows a "Continue in
  // the Eazo app" download CTA.
  async function handleShare() {
    setSharing(true);
    try {
      const text = todo.completed
        ? `Just finished: ${todo.title}`
        : `Working on: ${todo.title}`;
      const images = todo.attachmentUrl ? [todo.attachmentUrl] : undefined;
      const { accepted } = await share.compose({ text, images });
      if (accepted) toast.success("Opened in Eazo");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed";
      toast.error(message);
    } finally {
      setSharing(false);
    }
  }

  const isDisabled = busy || uploading || sharing;

  return (
    <div className="group rounded-[14px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.09)] transition-all duration-200 hover:bg-white/86 hover:shadow-[0_14px_32px_rgba(15,23,42,0.11)]">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={isDisabled}
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
                disabled={isDisabled}
                aria-label="Save"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/45 transition-colors hover:bg-white/80 hover:text-[#EE5C2A] disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleCancel}
                disabled={isDisabled}
                aria-label="Cancel"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/45 transition-colors hover:bg-white/80 hover:text-slate-950/72 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              {/* Attach image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isDisabled}
                aria-label="Attach image"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white/80 hover:text-[#EE5C2A] disabled:opacity-40"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Share to the Eazo Community feed via @eazo/sdk's share.compose. */}
              <button
                onClick={handleShare}
                disabled={isDisabled}
                aria-label="Share to Eazo"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white/80 hover:text-[#EE5C2A] disabled:opacity-40"
              >
                {sharing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                onClick={() => { setDraft(todo.title); setEditing(true); }}
                disabled={isDisabled}
                aria-label="Edit"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white/80 hover:text-slate-950/72"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDisabled}
                aria-label="Delete"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-950/35 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Attachment thumbnail */}
      {todo.attachmentUrl && (
        <div className="relative mt-2.5 ml-8 w-fit">
          <div className="group/img relative overflow-hidden rounded-[10px] border border-white/70 shadow-[0_4px_12px_rgba(15,23,42,0.09)]">
            <Image
              src={todo.attachmentUrl}
              alt="attachment"
              width={160}
              height={120}
              className="block h-[100px] w-[140px] object-cover"
              unoptimized
            />
            {/* Remove overlay */}
            <button
              onClick={handleRemoveAttachment}
              disabled={isDisabled}
              aria-label="Remove attachment"
              className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-slate-950/0 opacity-0 transition-all duration-200 group-hover/img:bg-slate-950/30 group-hover/img:opacity-100 disabled:cursor-not-allowed"
            >
              <ImageOff className="h-4 w-4 text-white drop-shadow" />
            </button>
          </div>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploading && (
        <div className="mt-2 ml-8 flex items-center gap-1.5 text-[12px] text-slate-950/45">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading…</span>
        </div>
      )}
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
