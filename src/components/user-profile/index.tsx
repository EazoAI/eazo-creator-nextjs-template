"use client";

import { useEffect, useState } from "react";
import type { Status } from "./types";
import { fetchUserProfile } from "@/utils/user-profile";
import { LoadingState } from "./loading-state";
import { ErrorState } from "./error-state";
import { ProfileCard } from "./profile-card";

export function UserProfileExample() {
  const [status, setStatus] = useState<Status>({ type: "idle" });

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {status.type === "idle" || status.type === "loading" ? (
          <LoadingState />
        ) : status.type === "error" ? (
          <ErrorState message={status.message} />
        ) : (
          <ProfileCard user={status.user} />
        )}
      </div>
    </div>
  );
}
