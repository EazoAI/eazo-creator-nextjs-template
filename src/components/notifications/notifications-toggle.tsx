"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { auth, notifications } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

import { request } from "@/lib/api/request";

/** Subscribe toggle + "Send test" button shown above the todo list. */
export function NotificationsToggle() {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const platform = useEazo((s) => s.device.platform);
  const isMobileHost = platform === "mobile";

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    notifications
      .isSubscribed()
      .then((r) => {
        if (!cancelled) setSubscribed(r.subscribed);
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    const wantOn = subscribed !== true;
    setSubscribed(wantOn); // optimistic
    try {
      const result = wantOn
        ? await notifications.subscribe()
        : await notifications.unsubscribe();
      setSubscribed(result.subscribed);
      if (!isMobileHost) {
        toast.info(t("notifications.webOnlyToast"));
      } else if (result.subscribed) {
        toast.success(t("notifications.subscribedToast"));
      } else {
        toast.success(t("notifications.unsubscribedToast"));
      }
    } catch (err) {
      console.error("[notifications] toggle failed", err);
      setSubscribed(!wantOn); // revert
      toast.error(t("notifications.toggleFailed"));
    } finally {
      setToggling(false);
    }
  }

  async function handleSendTest() {
    if (sending) return;
    setSending(true);
    try {
      const sessionHeader = await auth.getSessionHeader();
      if (!sessionHeader) {
        toast.error(t("notifications.sessionNotReady"));
        console.warn(
          "[notifications] test publish skipped: auth.getSessionHeader() returned null",
        );
        return;
      }

      const res = await request("/api/notifications/test", { method: "POST" });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (!res.ok) {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : `HTTP ${res.status}`;
        console.error("[notifications] test publish failed", {
          status: res.status,
          body,
        });
        toast.error(t("notifications.testFailed", { message }));
        return;
      }

      const data = body as { delivered: number; publishId: string };
      if (data.delivered > 0) {
        toast.success(t("notifications.sent", { count: data.delivered }));
      } else {
        toast.info(t("notifications.noSubscribers"));
      }
    } catch (err) {
      console.error("[notifications] test publish unexpected error", err);
      toast.error(
        err instanceof Error
          ? t("notifications.testFailed", { message: err.message })
          : t("notifications.testFailedGeneric"),
      );
    } finally {
      setSending(false);
    }
  }

  const showHint = subscribed !== null && !isMobileHost;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-[14px] border border-white/70 bg-white/60 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-950/5">
          {subscribed ? (
            <Bell className="h-4 w-4 text-[#EE5C2A]" />
          ) : (
            <BellOff className="h-4 w-4 text-slate-950/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-950/80">
            {t("notifications.title")}
          </p>
          <p className="text-[12px] text-slate-950/45">
            {showHint
              ? t("notifications.webHint")
              : subscribed === null
                ? t("notifications.loading")
                : subscribed
                  ? t("notifications.subscribed")
                  : t("notifications.unsubscribed")}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || subscribed === null}
          className={`flex h-8 items-center justify-center rounded-[10px] px-3 text-[12px] font-semibold transition-all duration-200 ${
            subscribed
              ? "bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] text-white shadow-[0_4px_10px_rgba(238,92,42,0.32)] hover:brightness-105"
              : "border border-white/70 bg-white/72 text-slate-950/60 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:bg-white/86"
          } disabled:opacity-50`}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : subscribed ? (
            t("common.on")
          ) : (
            t("common.off")
          )}
        </button>
      </div>
      <button
        onClick={handleSendTest}
        disabled={sending}
        className="self-end h-7 rounded-[8px] border border-white/70 bg-white/72 px-3 text-[11px] font-semibold text-slate-950/55 shadow-[0_2px_6px_rgba(15,23,42,0.05)] transition-colors hover:bg-white/86 hover:text-[#EE5C2A] disabled:opacity-50"
      >
        {sending ? t("notifications.sending") : t("notifications.sendTest")}
      </button>
    </div>
  );
}
