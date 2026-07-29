"use client";

import { useState } from "react";
import { Karta, Napoveda, Tlacitko, Znacka } from "./Ui";
import {
  formatBytes,
  PORTAL_LIMITS,
  STRUKTURA_DOKUMENTACE,
} from "@/lib/portal/spec";
import { sestavitZip, type PolozkaBalicku } from "@/lib/portal/balicek";

interface Props {
  polozky: PolozkaBalicku[];
  onOdebrat: (id: string) => void;
}

export function KrokBalicek({ polozky, onOdebrat }: Props) {
  const [stahuji, setStahuji] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const celkem = polozky.reduce((s, p) => s + p.bytes.length, 0);
  const vadne = polozky.filter((p) => !p.jePdfa3).length;
  const chybejici = STRUKTURA_DOKUMENTACE.filter(
    (s) => !polozky.some((p) => p.slozka === s.id),
  );

  async function stahnout() {
    setStahuji(true);
    setChyba(null);
    try {
      const zip = await sestavitZip(polozky);
      const url = URL.createObjectURL(
        new Blob([zip.slice()], { type: "application/zip" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "dokumentace_balicek.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : String(e));
    } finally {
      setStahuji(false);
    }
  }

  if (!polozky.length) {
    return (
      <Karta>
        <p className="text-sm font-semibold">Balíček je prázdný</p>
        <Napoveda>
          V kroku Kontrola u každého hotového souboru vyber, do které části
          dokumentace patří, a přidej ho sem. Až budeš mít všechno, stáhneš si
          celý balíček ve struktuře, kterou portál vyžaduje.
        </Napoveda>
      </Karta>
    );
  }

  return (
    <div className="space-y-5">
      <Karta>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              {polozky.length} {souboruMnozne(polozky.length)} ·{" "}
              {formatBytes(celkem)}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
              Limit dokumentace: {formatBytes(PORTAL_LIMITS.dokumentaceCelkem)}{" "}
              a {PORTAL_LIMITS.dokumentacePocetSouboru.toLocaleString("cs")}{" "}
              souborů.
            </p>
          </div>
          <Tlacitko varianta="hlavni" onClick={stahnout} disabled={stahuji}>
            {stahuji ? "Balím…" : "Stáhnout ZIP"}
          </Tlacitko>
        </div>
        {chyba && (
          <p className="mt-3 text-sm" style={{ color: "var(--cervena)" }}>
            {chyba}
          </p>
        )}
      </Karta>

      {vadne > 0 && (
        <Karta>
          <p className="text-sm font-semibold" style={{ color: "var(--cervena)" }}>
            {vadne} {souboruMnozne(vadne)} v balíčku není PDF/A-3
          </p>
          <Napoveda>
            Portál je odmítne. Vrať se do kroku Cílový formát a převeď je
            profilem Portál stavebníka.
          </Napoveda>
        </Karta>
      )}

      <Karta>
        <p className="text-sm font-semibold">Obsah podle částí dokumentace</p>
        <ul className="mt-3 space-y-3">
          {STRUKTURA_DOKUMENTACE.map((s) => {
            const patrici = polozky.filter((p) => p.slozka === s.id);
            return (
              <li key={s.id}>
                <div className="flex items-center gap-2">
                  <Znacka stav={patrici.length ? "ok" : "info"} />
                  <span className="text-sm font-medium">
                    {s.id} — {s.nazev}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--tlumeny)" }}
                  >
                    {s.formaty}
                  </span>
                </div>
                {patrici.length > 0 ? (
                  <ul className="ml-8 mt-1 space-y-1">
                    {patrici.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span
                          className="truncate"
                          style={{
                            color: p.jePdfa3
                              ? "var(--text)"
                              : "var(--cervena)",
                          }}
                        >
                          {p.nazev} · {formatBytes(p.bytes.length)}
                          {p.jePdfa3 ? "" : " — není PDF/A-3"}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOdebrat(p.id)}
                          className="shrink-0 rounded border px-2 py-0.5 hover:opacity-80"
                          style={{
                            borderColor: "var(--linka)",
                            color: "var(--tlumeny)",
                          }}
                        >
                          Odebrat
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className="ml-8 mt-1 text-xs"
                    style={{ color: "var(--tlumeny)" }}
                  >
                    zatím prázdné
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Karta>

      {chybejici.length > 0 && (
        <Karta>
          <p className="text-sm font-semibold" style={{ color: "var(--oranzova)" }}>
            Nevyplněno: {chybejici.map((s) => s.id).join(", ")}
          </p>
          <Napoveda>
            Portál vyžaduje nahrát dokumentaci vždy celou. Pokud některá část
            k tvému záměru nepatří, prostě ji v portálu nevyplňuj — tento
            přehled je jen kontrola, ať na nic nezapomeneš.
          </Napoveda>
        </Karta>
      )}
    </div>
  );
}

function souboruMnozne(n: number) {
  if (n === 1) return "soubor";
  if (n >= 2 && n <= 4) return "soubory";
  return "souborů";
}
