"use client";

import { ArrowLeft, Eye, EyeOff, Key, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { auth } from "@eazo/sdk";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";

// ── Brand icons ────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// ── Provider icon map ──────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  "google":      <GoogleIcon className="size-5" />,
  "twitter":     <TwitterXIcon className="size-5 text-black" />,
  "apple":       <AppleIcon className="size-5 text-black" />,
  "apple:web":   <AppleIcon className="size-5 text-black" />,
  "github":      <GithubIcon className="size-5 text-[#24292e]" />,
};

function providerLabel(provider: string, nameEn: string, tooltip: Record<string, string>): string {
  return tooltip["en-US"] || nameEn || provider;
}

// ── Style constants ────────────────────────────────────────────────

const glassInputClass =
  "h-[48px] w-full rounded-[14px] border border-white/70 bg-white/72 px-4 text-[15px] text-slate-950/80 shadow-[0_12px_28px_rgba(15,23,42,0.09)] transition-all duration-200 placeholder:text-slate-950/40 focus:border-[#EE5C2A]/48 focus:bg-white/86 focus:ring-4 focus:ring-[#EE5C2A]/12 focus:outline-none";
const glassActionClass =
  "h-[52px] w-full cursor-pointer rounded-[16px] border border-white/72 bg-white/74 text-[15px] font-semibold text-slate-950/82 shadow-[0_12px_30px_rgba(15,23,42,0.09)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_16px_32px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
const primaryActionClass =
  "h-[52px] w-full rounded-[16px] bg-[linear-gradient(180deg,#F47A42_0%,#EE5C2A_100%)] text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(238,92,42,0.32)] transition-all duration-200 hover:brightness-105 hover:shadow-[0_14px_30px_rgba(238,92,42,0.36)] disabled:cursor-not-allowed disabled:opacity-50";
const dividerLabelClass = "text-[13px] font-medium tracking-wide text-slate-950/42";

// ── Component ──────────────────────────────────────────────────────

export function LoginModal() {
  const open = useAuthStore((s) => s.loginModalOpen);
  const closeLoginModal = useAuthStore((s) => s.closeLoginModal);

  const connections = useAuthStore((s) => s.socialConnections);
  const connectionsLoading = useAuthStore((s) => s.socialConnectionsLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailMode, setEmailMode] = useState<"password" | "code">("code");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loginInProgressRef = useRef(false);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state on close
  useEffect(() => {
    if (open) return;
    setShowEmailInput(false);
    setEmailMode("code");
    setEmail("");
    setPassword("");
    setCode("");
    setCodeSent(false);
    setResendCooldown(0);
    setIsSubmitting(false);
    setIsSendingCode(false);
    setShowPassword(false);
    setError(null);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }, [open]);

  // Detect return from social popup
  useEffect(() => {
    const reset = () => {
      if (loginInProgressRef.current) {
        loginInProgressRef.current = false;
        setIsSubmitting(false);
      }
    };
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("focus", reset);
    return () => {
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("focus", reset);
    };
  }, []);

  useEffect(() => () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); }, []);

  function startResendCooldown() {
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((n) => {
        if (n <= 1) { clearInterval(resendTimerRef.current!); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!email || !email.includes("@")) return;
    setIsSendingCode(true);
    setError(null);
    try {
      await auth.sendEmailCode(email);
      setCodeSent(true);
      startResendCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleEmailLogin() {
    setIsSubmitting(true);
    setError(null);
    try {
      if (emailMode === "code") {
        await auth.loginWithEmailCode(email, code);
      } else {
        await auth.loginWithEmailPassword(email, password);
      }
      closeLoginModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialLogin(identifier: string) {
    if (!agreed) return;
    setIsSubmitting(true);
    setError(null);
    loginInProgressRef.current = true;
    try {
      await auth.loginWithSocial(identifier);
      closeLoginModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Social login failed");
      loginInProgressRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) closeLoginModal(); }}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(248,246,243,0.95)_100%)] p-8 shadow-[0_32px_80px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.8)] backdrop-blur-xl sm:max-w-[480px]"
        showCloseButton={false}
      >
        <DialogClose className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/88 text-stone-500 shadow-[0_4px_12px_rgba(22,28,40,0.08)] transition-colors hover:bg-white hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EE5C2A]/30">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogHeader className="items-center !gap-1 text-center">
          <DialogTitle className="text-[28px] font-semibold tracking-tight text-slate-950/92">
            Welcome
          </DialogTitle>
          <DialogDescription className="text-[15px] font-medium text-slate-950/52">
            Sign in to continue
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto mt-3 w-full max-w-[420px] space-y-3">

          {/* Social providers */}
          {!showEmailInput && (
            <div className="w-full space-y-3">
              {connectionsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                </div>
              ) : (
                connections.map((conn) => (
                  <button
                    key={conn.identifier}
                    onClick={() => handleSocialLogin(conn.identifier)}
                    className={glassActionClass}
                    disabled={isSubmitting || !agreed}
                  >
                    <div className="flex h-full translate-x-4 items-center justify-center gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        {PROVIDER_ICONS[conn.provider] ?? null}
                      </span>
                      <span className="w-[180px] text-left">
                        Continue with {providerLabel(conn.provider, conn.name_en, conn.tooltip)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Divider */}
          {!showEmailInput && (
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-950/10" />
              <span className={dividerLabelClass}>or</span>
              <div className="h-px flex-1 bg-slate-950/10" />
            </div>
          )}

          {/* Email section */}
          {showEmailInput ? (
            <div className="w-full space-y-3">
              {/* Back button */}
              <button
                type="button"
                onClick={() => { setShowEmailInput(false); setError(null); }}
                className="flex items-center gap-1.5 text-sm text-slate-950/52 hover:text-slate-950/80"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>

              {/* Email input */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${glassInputClass} pl-11`}
                  autoFocus
                />
                <svg className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-950/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Code mode */}
              {emailMode === "code" ? (
                <div className="space-y-3">
                  {codeSent ? (
                    <>
                      <div className="space-y-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Verification code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className={glassInputClass}
                          autoFocus
                        />
                        <div className="flex justify-between text-sm text-slate-950/52">
                          <span>Code sent to {email}</span>
                          <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={isSendingCode || resendCooldown > 0}
                            className="font-medium text-[#EE5C2A] hover:text-[#d54e1f] disabled:opacity-60"
                          >
                            {isSendingCode ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                          </button>
                        </div>
                      </div>
                      <button onClick={handleEmailLogin} disabled={!email || !code || isSubmitting} className={primaryActionClass}>
                        {isSubmitting ? "Signing in…" : "Log in"}
                      </button>
                    </>
                  ) : (
                    <button onClick={handleSendCode} disabled={!email || !email.includes("@") || isSendingCode || !agreed} className={primaryActionClass}>
                      {isSendingCode ? "Sending…" : "Send code"}
                    </button>
                  )}
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-slate-950/10" />
                    <span className={dividerLabelClass}>or</span>
                    <div className="h-px flex-1 bg-slate-950/10" />
                  </div>
                  <button type="button" onClick={() => setEmailMode("password")} className={`${glassInputClass} flex items-center justify-center`}>
                    Continue with password
                  </button>
                </div>
              ) : (
                /* Password mode */
                <div className="space-y-3">
                  <div className="group relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${glassInputClass} pr-12 pl-11`}
                    />
                    <Key className="absolute top-1/2 left-4 h-4 w-5 -translate-y-1/2 text-slate-950/45" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-950/45 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:text-slate-950/72"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button onClick={handleEmailLogin} disabled={!email || !password || isSubmitting} className={primaryActionClass}>
                    {isSubmitting ? "Signing in…" : "Log in"}
                  </button>
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-slate-950/10" />
                    <span className={dividerLabelClass}>or</span>
                    <div className="h-px flex-1 bg-slate-950/10" />
                  </div>
                  <button type="button" onClick={() => setEmailMode("code")} className={`${glassInputClass} flex items-center justify-center`}>
                    Continue with verification code
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Email trigger */
            <button
              type="button"
              onClick={() => setShowEmailInput(true)}
              className={`${glassInputClass} flex cursor-text items-center gap-3 !text-slate-950/40`}
            >
              <svg className="h-5 w-5 !text-slate-950/28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Continue with email</span>
            </button>
          )}

          {/* Error message */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
