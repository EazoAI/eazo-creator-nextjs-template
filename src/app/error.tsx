"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Home, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { cn } from "@/utils/utils";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  const showDetails =
    process.env.NODE_ENV === "development" && Boolean(error.message);

  return (
    <ErrorPageShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <AlertCircle
            className="size-8 text-destructive"
            strokeWidth={1.5}
          />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("errors.generic.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("errors.generic.description")}
        </p>

        {showDetails ? (
          <p className="mt-4 max-w-full rounded-lg border border-border/80 bg-muted/50 px-3 py-2 text-left font-mono text-xs text-muted-foreground break-all">
            {error.message}
            {error.digest ? (
              <span className="mt-1 block text-[0.65rem] opacity-70">
                digest: {error.digest}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" className="gap-2" onClick={() => reset()}>
            <RotateCcw className="size-4" />
            {t("errors.generic.tryAgain")}
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
          >
            <Home className="size-4" />
            {t("errors.generic.backHome")}
          </Link>
        </div>
      </div>
    </ErrorPageShell>
  );
}
