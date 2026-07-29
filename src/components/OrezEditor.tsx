"use client";

import { useEffect, useRef, useState } from "react";
import { Tlacitko } from "./Ui";
import type { Stranka, Zdroj } from "@/lib/pdf/compose";
import { nahled, otevrit } from "@/lib/pdf/render";

interface Props {
  stranka: Stranka;
  zdroj: Zdroj;
  /** Rozměr původní stránky v mm, kvůli přepočtu výřezu. */
  rozmerMm?: { sirka: number; vyska: number };
  onUlozit: (orez: Stranka["orez"]) => void;
  onZavrit: () => void;
}

type Vyber = { x: number; y: number; sirka: number; vyska: number };

export function OrezEditor({
  stranka,
  zdroj,
  rozmerMm,
  onUlozit,
  onZavrit,
}: Props) {
  const [obrazek, setObrazek] = useState<string | null>(null);
  const [vyber, setVyber] = useState<Vyber | null>(stranka.orez ?? null);
  const [kresli, setKresli] = useState<{ x: number; y: number } | null>(null);
  const plocha = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      try {
        if (zdroj.typ === "obrazek") {
          const url = URL.createObjectURL(new Blob([zdroj.bytes.slice()]));
          if (!zruseno) setObrazek(url);
          return;
        }
        const doc = await otevrit(zdroj.id, zdroj.bytes);
        const url = await nahled(doc, stranka.indexVeZdroji + 1, 900);
        if (!zruseno) setObrazek(url);
      } catch (e) {
        console.warn("Náhled pro ořez selhal:", e);
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [zdroj, stranka.indexVeZdroji]);

  /** Přepočte pozici ukazatele na poměrnou souřadnici 0–1. */
  function pomer(e: React.PointerEvent): { x: number; y: number } {
    const r = plocha.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function zacit(e: React.PointerEvent) {
    // Bez toho prohlížeč tažení pochopí jako označování textu a výběr se
    // vůbec nenakreslí.
    e.preventDefault();
    // Zachycení ukazatele je jen pohodlí (tažení mimo obrázek). Když ho
    // prohlížeč odmítne, kreslení musí fungovat dál.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* nevadí */
    }
    const p = pomer(e);
    setKresli(p);
    setVyber({ x: p.x, y: p.y, sirka: 0, vyska: 0 });
  }

  function tahnout(e: React.PointerEvent) {
    if (!kresli) return;
    const p = pomer(e);
    setVyber({
      x: Math.min(kresli.x, p.x),
      y: Math.min(kresli.y, p.y),
      sirka: Math.abs(p.x - kresli.x),
      vyska: Math.abs(p.y - kresli.y),
    });
  }

  function skoncit() {
    setKresli(null);
    // Omylem klepnutí bez tažení nemá vytvořit degenerovaný ořez.
    setVyber((v) => (v && v.sirka > 0.02 && v.vyska > 0.02 ? v : null));
  }

  const vysledekMm =
    vyber && rozmerMm
      ? {
          sirka: Math.round(rozmerMm.sirka * vyber.sirka),
          vyska: Math.round(rozmerMm.vyska * vyber.vyska),
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Ořez stránky"
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-auto rounded-lg border p-5"
        style={{ borderColor: "var(--linka)", background: "var(--panel)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Ořez stránky</p>
            <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
              Tažením myši vyznač část, která má zůstat. Zbytek se ze souboru
              opravdu odstraní, nezůstane jen skrytý.
            </p>
          </div>
          <Tlacitko varianta="tiche" onClick={onZavrit}>
            Zavřít
          </Tlacitko>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            ref={plocha}
            onPointerDown={zacit}
            onPointerMove={tahnout}
            onPointerUp={skoncit}
            className="relative inline-block cursor-crosshair touch-none select-none"
            style={{ background: "var(--pozadi)" }}
          >
            {obrazek ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={obrazek}
                alt="Stránka k ořezu"
                draggable={false}
                className="block max-h-[55vh] w-auto"
              />
            ) : (
              <div className="flex h-64 w-96 items-center justify-center text-xs">
                náhled…
              </div>
            )}

            {vyber && (
              <>
                {/* ztmavení odříznutých částí */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    clipPath: `polygon(0% 0%, 0% 100%, ${vyber.x * 100}% 100%, ${vyber.x * 100}% ${vyber.y * 100}%, ${(vyber.x + vyber.sirka) * 100}% ${vyber.y * 100}%, ${(vyber.x + vyber.sirka) * 100}% ${(vyber.y + vyber.vyska) * 100}%, ${vyber.x * 100}% ${(vyber.y + vyber.vyska) * 100}%, ${vyber.x * 100}% 100%, 100% 100%, 100% 0%)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute border-2"
                  style={{
                    borderColor: "var(--modra)",
                    left: `${vyber.x * 100}%`,
                    top: `${vyber.y * 100}%`,
                    width: `${vyber.sirka * 100}%`,
                    height: `${vyber.vyska * 100}%`,
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--tlumeny)" }}>
            {vysledekMm
              ? `Výřez ${vysledekMm.sirka} × ${vysledekMm.vyska} mm z původních ${rozmerMm?.sirka} × ${rozmerMm?.vyska} mm`
              : "Zatím není nic vybráno — celá stránka zůstane."}
          </p>
          <div className="flex gap-2">
            <Tlacitko onClick={() => setVyber(null)} disabled={!vyber}>
              Zrušit výběr
            </Tlacitko>
            <Tlacitko
              varianta="hlavni"
              onClick={() => {
                onUlozit(vyber ?? undefined);
                onZavrit();
              }}
            >
              Použít
            </Tlacitko>
          </div>
        </div>

        <p
          className="mt-3 rounded-md border p-3 text-xs leading-relaxed"
          style={{ borderColor: "var(--linka)", color: "var(--tlumeny)" }}
        >
          Ořez sám o sobě měřítko výkresu nemění — kresba si podrží velikost,
          jen se zmenší list. Měřítko se změní teprve tehdy, když v kroku
          &bdquo;Formát listu&ldquo; zvolíš &bdquo;Vejít se&ldquo; nebo
          &bdquo;Vyplnit&ldquo;.
        </p>
      </div>
    </div>
  );
}
