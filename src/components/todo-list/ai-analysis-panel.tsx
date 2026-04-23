"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { auth } from "@eazo/sdk";

interface AiAnalysisPanelProps {
  todoCount: number;
  onClose: () => void;
}

export function AiAnalysisPanel({ todoCount, onClose }: AiAnalysisPanelProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      setText("");

      try {
        const sessionHeader = await auth.getSessionHeader();
        const res = await fetch("/api/todos/analyze", {
          method: "POST",
          headers: sessionHeader ? { "x-eazo-session": sessionHeader } : {},
          signal: controller.signal,
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "Request failed");
          throw new Error(msg || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const delta = decoder.decode(value, { stream: true });
          setText((prev) => prev + delta);
          if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message ?? "Failed to analyze todos");
        }
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoCount]);

  return (
    <div className="mt-4 overflow-hidden rounded-[18px] border border-white/70 bg-white/60 shadow-[0_12px_28px_rgba(15,23,42,0.09)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-slate-950/80">AI Analysis</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EE5C2A]" />}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-[8px] text-slate-950/35 transition-colors hover:bg-white/80 hover:text-slate-950/72"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div ref={contentRef} className="max-h-64 overflow-y-auto px-4 py-3.5">
        {error ? (
          <p className="text-[13px] text-red-500">{error}</p>
        ) : text ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-950/72">
            {text}
            {loading && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-[#EE5C2A] align-middle" />
            )}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-slate-950/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Analyzing your todos…</span>
          </div>
        )}
      </div>
    </div>
  );
}
