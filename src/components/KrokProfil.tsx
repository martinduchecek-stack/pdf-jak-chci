"use client";

import { Napoveda } from "./Ui";
import { PROFILY, type ProfilId } from "@/lib/gs/profiles";

export function KrokProfil({
  vybrany,
  onZmena,
}: {
  vybrany: ProfilId;
  onZmena: (id: ProfilId) => void;
}) {
  return (
    <div>
      <Napoveda>
        Pro podání na Portál stavebníka je správná volba první možnost. Ostatní
        profily jsou pro případy, kdy PDF potřebuješ jinam.
      </Napoveda>

      <div className="mt-5 space-y-3">
        {PROFILY.map((p) => {
          const aktivni = p.id === vybrany;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onZmena(p.id)}
              className="block w-full rounded-lg border p-4 text-left transition-colors"
              style={{
                borderColor: aktivni
                  ? "var(--modra)"
                  : p.doporuceno
                    ? "var(--modra)"
                    : "var(--linka)",
                borderWidth: aktivni ? 2 : 1,
                background: aktivni ? "var(--modra-svetla)" : "var(--panel)",
              }}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{p.nazev}</span>
                {p.doporuceno && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ background: "var(--modra)" }}
                  >
                    doporučeno
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
                {p.podtitul}
              </p>
              {p.opora && (
                <p
                  className="mt-2 text-[11px] italic"
                  style={{ color: "var(--tlumeny)" }}
                >
                  {p.opora}
                </p>
              )}
              {p.varovani?.map((v) => (
                <p
                  key={v}
                  className="mt-2 text-[11px] leading-relaxed"
                  style={{ color: "var(--oranzova)" }}
                >
                  {v}
                </p>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
