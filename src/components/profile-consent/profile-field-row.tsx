"use client";

import Image from "next/image";

/**
 * One revealable profile field. When `locked` it shows a privacy placeholder
 * (the value is `null` until the matching scope is granted); once revealed it
 * renders the real value (or an avatar image).
 */
export function ProfileFieldRow({
  label,
  value,
  locked,
  avatar = false,
}: {
  label: string;
  value: string | null;
  locked: boolean;
  avatar?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {locked ? (
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground/70">
          ••••••
        </span>
      ) : avatar && value ? (
        <Image
          src={value.startsWith("//") ? `https:${value}` : value}
          alt={label}
          width={32}
          height={32}
          className="rounded-full object-cover ring-2 ring-border"
        />
      ) : (
        <span className="truncate text-right text-sm font-medium text-foreground">
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}
