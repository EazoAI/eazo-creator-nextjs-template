"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, UserRound, X } from "lucide-react";
import { fetchUserProfile } from "@/utils/user-profile";
import type { UserInfo, Status } from "@/components/user-profile/types";

export function UserBadge() {
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus({ type: "loading" });
    fetchUserProfile()
      .then((user) => setStatus({ type: "success", user }))
      .catch((err: unknown) =>
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        })
      );
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const user = status.type === "success" ? status.user : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-sm shadow-sm transition-shadow hover:shadow-md"
      >
        {status.type === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.nickname ?? "avatar"}
            width={24}
            height={24}
            className="size-6 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user ? (user.nickname ?? user.email ?? "?")[0].toUpperCase() : <UserRound className="h-3.5 w-3.5" />}
          </div>
        )}
        {user && (
          <span className="max-w-[120px] truncate font-medium text-foreground">
            {user.nickname ?? user.email ?? user.userId}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && user && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.nickname ?? "avatar"}
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                  {(user.nickname ?? user.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.nickname ?? "—"}</p>
                {user.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details */}
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
            <Row label="User ID" value={user.userId} mono />
            {user.lang && <Row label="Language" value={user.lang} />}
            {user.region && <Row label="Region" value={user.region} />}
            {user.createdAt && (
              <Row label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
            )}
          </div>
        </div>
      )}

      {/* Error state — subtle indicator */}
      {status.type === "error" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-destructive/20 bg-background px-4 py-3 shadow-lg text-xs text-destructive">
          Failed to load user info.
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
      <span className={`truncate text-right text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
