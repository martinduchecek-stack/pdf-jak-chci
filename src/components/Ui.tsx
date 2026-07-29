"use client";

import type { ReactNode } from "react";
import type { Zavaznost } from "@/lib/pdf/inspect";

export function Karta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-linka bg-panel p-5 ${className}`}
      style={{ borderColor: "var(--linka)", background: "var(--panel)" }}
    >
      {children}
    </div>
  );
}

export function Tlacitko({
  children,
  onClick,
  varianta = "vedlejsi",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  varianta?: "hlavni" | "vedlejsi" | "tiche";
  disabled?: boolean;
  title?: string;
}) {
  const styl =
    varianta === "hlavni"
      ? { background: "var(--modra)", color: "#fff", borderColor: "var(--modra)" }
      : varianta === "tiche"
        ? {
            background: "transparent",
            color: "var(--tlumeny)",
            borderColor: "transparent",
          }
        : {
            background: "var(--panel)",
            color: "var(--text)",
            borderColor: "var(--linka)",
          };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={styl}
      className="rounded-md border px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-85"
    >
      {children}
    </button>
  );
}

const IKONY: Record<Zavaznost, string> = {
  ok: "✓",
  varovani: "!",
  chyba: "✕",
  info: "i",
};

const BARVY: Record<Zavaznost, string> = {
  ok: "var(--zelena)",
  varovani: "var(--oranzova)",
  chyba: "var(--cervena)",
  info: "var(--modra)",
};

export function Znacka({ stav }: { stav: Zavaznost }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: BARVY[stav] }}
    >
      {IKONY[stav]}
    </span>
  );
}

export function Radek({
  stav,
  popis,
  detail,
}: {
  stav: Zavaznost;
  popis: string;
  detail?: string;
}) {
  return (
    <li className="flex gap-3 py-2">
      <Znacka stav={stav} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{popis}</p>
        {detail && (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--tlumeny)" }}>
            {detail}
          </p>
        )}
      </div>
    </li>
  );
}

export function Napoveda({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-2 text-sm leading-relaxed"
      style={{ color: "var(--tlumeny)" }}
    >
      {children}
    </p>
  );
}
