"use client";

import { useState } from "react";
import { Karta, Napoveda, Tlacitko, Znacka } from "./Ui";
import { formatBytes, STRUKTURA_DOKUMENTACE, type SlozkaId } from "@/lib/portal/spec";
import { zabalitDavku, type PrubehDavky, type VysledekDavky } from "@/lib/portal/davka";
import { profilById, type ProfilId } from "@/lib/gs/profiles";

interface Props {
  pocetZdroju: number;
  profil: ProfilId;
  bezi: boolean;
  prubeh: PrubehDavky | null;
  vysledky: VysledekDavky[];
  onSpustit: () => void;
  onZastavit: () => void;
  onPridatDoBalicku: (v: VysledekDavky, slozka: SlozkaId) => void;
  jeVBalicku: (v: VysledekDavky) => boolean;
}

export function KrokDavka({
  pocetZdroju,
  profil,
  bezi,
  prubeh,
  vysledky,
  onSpustit,
  onZastavit,
  onPridatDoBalicku,
  jeVBalicku,
}: Props) {
  const [stahuji, setStahuji] = useState(false);
  const [hromadnaSlozka, setHromadnaSlozka] = useState<SlozkaId>("D");
  const p = profilById(profil);

  const hotove = vysledky.filter((v) => v.bytes);
  const chybne = vysledky.filter((v) => v.chyba);
  const neprosly = hotove.filter(
    (v) => !(v.rozbor?.pdfaPart === "3" && v.rozbor?.maOutputIntent),
  );
  const celkovaVelikost = hotove.reduce((s, v) => s + (v.bytes?.length ?? 0), 0);

  async function stahnoutZip() {
    setStahuji(true);
    try {
      const zip = await zabalitDavku(vysledky);
      stahni(zip, "prevedene_pdfa3.zip", "application/zip");
    } finally {
      setStahuji(false);
    }
  }

  return (
    <div className="space-y-5">
      <Karta>
        <p className="text-sm font-semibold">
          {pocetZdroju} {souboruMnozne(pocetZdroju)} k převodu
        </p>
        <Napoveda>
          Každý soubor se převede samostatně — na výstupu dostaneš stejný počet
          PDF, jen ve formátu <strong>{p.nazev}</strong>. Nic se neslučuje,
          protože na portál se výkresy vkládají jednotlivě.
        </Napoveda>

        {bezi && prubeh && (
          <div className="mt-4">
            <div
              className="h-2 w-full overflow-hidden rounded"
              style={{ background: "var(--pozadi)" }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${(prubeh.hotovo / Math.max(1, prubeh.celkem)) * 100}%`,
                  background: "var(--modra)",
                }}
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--tlumeny)" }}>
              {prubeh.hotovo} / {prubeh.celkem}
              {prubeh.prave ? ` · právě: ${prubeh.prave}` : ""}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {bezi ? (
            <Tlacitko onClick={onZastavit}>Zastavit</Tlacitko>
          ) : (
            <Tlacitko
              varianta="hlavni"
              onClick={onSpustit}
              disabled={pocetZdroju === 0}
            >
              {vysledky.length ? "Převést znovu" : "Převést všechny"}
            </Tlacitko>
          )}
          {hotove.length > 0 && !bezi && (
            <Tlacitko onClick={stahnoutZip} disabled={stahuji}>
              {stahuji
                ? "Balím…"
                : `Stáhnout vše jako ZIP (${formatBytes(celkovaVelikost)})`}
            </Tlacitko>
          )}
        </div>
      </Karta>

      {vysledky.length > 0 && !bezi && (
        <Karta>
          <p className="text-sm font-semibold">
            Hotovo: {hotove.length} z {vysledky.length}
            {chybne.length ? ` · ${chybne.length} selhalo` : ""}
            {neprosly.length ? ` · ${neprosly.length} není PDF/A-3` : ""}
          </p>
          {neprosly.length > 0 && (
            <Napoveda>
              U souborů označených červeně se převod dokončil, ale výsledek
              nesplňuje PDF/A-3. Portál je odmítne — otevři je jednotlivě
              v režimu Jeden dokument a podívej se na podrobnou kontrolu.
            </Napoveda>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: "var(--tlumeny)" }}>
              Zařadit všechny hotové do části:
            </span>
            <select
              value={hromadnaSlozka}
              onChange={(e) => setHromadnaSlozka(e.target.value as SlozkaId)}
              className="rounded-md border px-2 py-1 text-xs"
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
            <button
              type="button"
              onClick={() =>
                hotove
                  .filter((v) => !jeVBalicku(v))
                  .forEach((v) => onPridatDoBalicku(v, hromadnaSlozka))
              }
              className="rounded border px-2 py-1 text-xs hover:opacity-80"
              style={{ borderColor: "var(--linka)" }}
            >
              Přidat vše
            </button>
          </div>
        </Karta>
      )}

      {vysledky.map((v) => {
        const ok = v.rozbor?.pdfaPart === "3" && v.rozbor?.maOutputIntent;
        return (
          <Karta key={v.zdrojId}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <Znacka stav={v.chyba ? "chyba" : ok ? "ok" : "varovani"} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.nazev}</p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{
                      color: v.chyba ? "var(--cervena)" : "var(--tlumeny)",
                    }}
                  >
                    {v.chyba
                      ? v.chyba
                      : `${v.rozbor?.pocetStran} str. · ${formatBytes(v.bytes?.length ?? 0)}` +
                        (v.rozbor?.strankyMm[0]
                          ? ` · ${v.rozbor.strankyMm[0].sirka}×${v.rozbor.strankyMm[0].vyska} mm`
                          : "") +
                        (ok
                          ? ` · PDF/A-3${v.rozbor?.pdfaConformance ?? ""}`
                          : " · NENÍ PDF/A-3")}
                  </p>
                </div>
              </div>
              {v.bytes && (
                <button
                  type="button"
                  onClick={() =>
                    stahni(v.bytes!, v.nazev, "application/pdf")
                  }
                  className="shrink-0 rounded border px-2 py-1 text-xs hover:opacity-80"
                  style={{ borderColor: "var(--linka)" }}
                >
                  Stáhnout
                </button>
              )}
            </div>
          </Karta>
        );
      })}
    </div>
  );
}

function stahni(bytes: Uint8Array, nazev: string, typ: string) {
  const url = URL.createObjectURL(new Blob([bytes.slice()], { type: typ }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nazev;
  a.click();
  URL.revokeObjectURL(url);
}

function souboruMnozne(n: number) {
  if (n === 1) return "soubor";
  if (n >= 2 && n <= 4) return "soubory";
  return "souborů";
}
