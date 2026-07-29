"use client";

import { useState } from "react";
import { Karta, Napoveda, Radek, Tlacitko } from "./Ui";
import {
  formatBytes,
  PORTAL_LIMITS,
  STRUKTURA_DOKUMENTACE,
  type SlozkaId,
} from "@/lib/portal/spec";
import type { Rozbor } from "@/lib/pdf/inspect";
import { profilById, type ProfilId } from "@/lib/gs/profiles";

interface Props {
  bezi: boolean;
  chyba: string | null;
  profil: ProfilId;
  /** Dokument se přeskládává, takže se ztratí vrstvy výkresu. */
  ztratiVrstvy: boolean;
  zmenaMeritka: { stranka: number; faktor: number }[];
  vystup: { bytes: Uint8Array; nazev: string; rozbor: Rozbor } | null;
  onSpustit: () => void;
  onStahnout: () => void;
  onPridatDoBalicku: (slozka: SlozkaId) => void;
  /** Tento výstup už v balíčku je. */
  jeVBalicku: boolean;
}

export function KrokKontrola({
  bezi,
  chyba,
  profil,
  ztratiVrstvy,
  zmenaMeritka,
  vystup,
  onSpustit,
  onStahnout,
  onPridatDoBalicku,
  jeVBalicku,
}: Props) {
  const p = profilById(profil);
  const [slozka, setSlozka] = useState<SlozkaId>("D");

  if (!vystup) {
    return (
      <div className="space-y-5">
        <Karta>
          <p className="text-sm font-semibold">Připraveno k převodu</p>
          <Napoveda>
            Vybraný profil: <strong>{p.nazev}</strong> — {p.podtitul}
          </Napoveda>
          {ztratiVrstvy && (
            <p
              className="mt-3 rounded-md border p-3 text-xs leading-relaxed"
              style={{ borderColor: "var(--oranzova)", color: "var(--oranzova)" }}
            >
              Protože stránky přeskládáváš, spojuješ nebo otáčíš, dokument se
              sestavuje znovu — přijdeš tím o vrstvy (OCG) a záložky původního
              PDF. Kresba zůstane beze změny. Necháš-li jediný soubor tak, jak
              je, převod proběhne bez přeskládání a vrstvy se zachovají.
            </p>
          )}
          {bezi && (
            <p className="mt-4 text-sm" style={{ color: "var(--modra)" }}>
              Převádím… při prvním spuštění se stahuje 15 MB Ghostscriptu, pak
              už je to okamžité.
            </p>
          )}
          {chyba && (
            <p className="mt-4 text-sm" style={{ color: "var(--cervena)" }}>
              {chyba}
            </p>
          )}
          <div className="mt-4">
            <Tlacitko varianta="hlavni" onClick={onSpustit} disabled={bezi}>
              {bezi ? "Převádím…" : "Převést a zkontrolovat"}
            </Tlacitko>
          </div>
        </Karta>
      </div>
    );
  }

  const r = vystup.rozbor;
  const chyby = r.nalezy.filter((n) => n.stav === "chyba").length;
  const velikost = vystup.bytes.length;
  const nadLimitPrilohy = velikost > PORTAL_LIMITS.prilohaSoubor;

  return (
    <div className="space-y-5">
      <Karta>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              {chyby === 0
                ? "Soubor je připraven k podání"
                : `Zbývá vyřešit ${chyby} ${chyby === 1 ? "problém" : "problémy"}`}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
              {vystup.nazev} · {r.pocetStran} str. · {formatBytes(velikost)}
              {r.strankyMm[0]
                ? ` · ${r.strankyMm[0].sirka}×${r.strankyMm[0].vyska} mm`
                : ""}
              {r.pdfaPart
                ? ` · PDF/A-${r.pdfaPart}${r.pdfaConformance ?? ""}`
                : ""}
            </p>
          </div>
          <Tlacitko varianta="hlavni" onClick={onStahnout}>
            Stáhnout PDF
          </Tlacitko>
        </div>

        <ul className="mt-4 border-t pt-2" style={{ borderColor: "var(--linka)" }}>
          {r.nalezy.map((n) => (
            <Radek key={n.klic} stav={n.stav} popis={n.popis} detail={n.detail} />
          ))}
          <Radek
            stav={nadLimitPrilohy ? "varovani" : "ok"}
            popis={
              nadLimitPrilohy
                ? `Velikost ${formatBytes(velikost)} přesahuje limit 100 MB pro přílohu žádosti`
                : `Velikost ${formatBytes(velikost)} se vejde do limitů portálu`
            }
            detail={
              nadLimitPrilohy
                ? "Do složky Dokumentace ho nahrát můžeš (tam limit na jeden soubor není), jako přílohu žádosti ne. Zkus profil „Do datové schránky“."
                : "Příloha žádosti max. 100 MB, celá žádost 1 GB, dokumentace 10 GB."
            }
          />
        </ul>
      </Karta>

      <Karta>
        <p className="text-sm font-semibold">Zařadit do balíčku dokumentace</p>
        <Napoveda>
          Vyber, kterou částí dokumentace tento soubor je. Až budeš mít všechny
          hotové, stáhneš si v kroku Balíček celou strukturu A–E najednou.
        </Napoveda>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={slozka}
            onChange={(e) => setSlozka(e.target.value as SlozkaId)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--linka)",
              background: "var(--panel)",
              color: "var(--text)",
            }}
          >
            {STRUKTURA_DOKUMENTACE.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.nazev}
              </option>
            ))}
          </select>
          <Tlacitko
            onClick={() => onPridatDoBalicku(slozka)}
            disabled={jeVBalicku}
            title={jeVBalicku ? "Tento soubor už v balíčku je" : undefined}
          >
            {jeVBalicku ? "V balíčku ✓" : "Přidat do balíčku"}
          </Tlacitko>
        </div>
      </Karta>

      {zmenaMeritka.length > 0 && (
        <Karta>
          <p className="text-sm font-semibold" style={{ color: "var(--oranzova)" }}>
            Změna měřítka na {zmenaMeritka.length}{" "}
            {zmenaMeritka.length === 1 ? "stránce" : "stránkách"}
          </p>
          <Napoveda>
            Kresba byla zmenšena nebo zvětšena, takže měřítko uvedené v rohovém
            razítku už neodpovídá skutečnosti:
          </Napoveda>
          <ul className="mt-2 text-xs" style={{ color: "var(--tlumeny)" }}>
            {zmenaMeritka.map((z) => (
              <li key={z.stranka}>
                strana {z.stranka} — na {(z.faktor * 100).toFixed(1)} % původní
                velikosti
              </li>
            ))}
          </ul>
        </Karta>
      )}

      <Karta>
        <p className="text-sm font-semibold">Co ještě musíš udělat sám</p>
        <ul className="mt-2 space-y-2 text-xs leading-relaxed" style={{ color: "var(--tlumeny)" }}>
          <li>
            <strong>Autorizační razítko.</strong> Elektronickou dokumentaci je
            nutné opatřit elektronickým autorizačním razítkem — kvalifikovaným
            podpisem s kvalifikovaným časovým razítkem (§ 13 odst. 3 písm. b
            autorizačního zákona). Podepisuj až teď, po převodu — pozdější
            úprava by podpis zneplatnila.
          </li>
          <li>
            <strong>Dokumentaci nahraj celou.</strong> Portál vyžaduje vložit
            všechny části A–E i tehdy, když měníš jediný dokument.
          </li>
          <li>
            <strong>Průvodní list.</strong> XML se vygeneruje jen tehdy, vyplní-li
            projektant průvodní list přímo v portálu přes magic link. Nahraješ-li
            hotové PDF, XML nevznikne.
          </li>
        </ul>
      </Karta>
    </div>
  );
}
