"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Karta, Napoveda, Radek, Tlacitko } from "./Ui";
import { rozeber, type Rozbor } from "@/lib/pdf/inspect";
import type { Stranka, Zdroj } from "@/lib/pdf/compose";
import { noveId } from "@/lib/stav";
import { formatBytes, PORTAL_LIMITS } from "@/lib/portal/spec";

interface Props {
  zdroje: Zdroj[];
  rozbory: Record<string, Rozbor>;
  onPridat: (z: Zdroj[], s: Stranka[], r: Record<string, Rozbor>) => void;
  onOdebrat: (id: string) => void;
}

export function KrokZdroje({ zdroje, rozbory, onPridat, onOdebrat }: Props) {
  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pretahuji, setPretahuji] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function zpracovat(soubory: FileList | File[]) {
    setNacitam(true);
    setChyba(null);
    const noveZdroje: Zdroj[] = [];
    const noveStranky: Stranka[] = [];
    const noveRozbory: Record<string, Rozbor> = {};

    try {
      for (const f of Array.from(soubory)) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const jePdf =
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const id = noveId(jePdf ? "pdf" : "img");

        if (jePdf) {
          const rozbor = await rozeber({ name: f.name, bytes });
          if (rozbor.chybaCteni) {
            setChyba(`${f.name}: ${rozbor.chybaCteni}`);
            continue;
          }
          noveRozbory[id] = rozbor;
          noveZdroje.push({ id, nazev: f.name, bytes, typ: "pdf" });

          const doc = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
          });
          for (let i = 0; i < doc.getPageCount(); i++) {
            noveStranky.push({
              id: noveId("str"),
              zdrojId: id,
              indexVeZdroji: i,
              rotace: 0,
            });
          }
        } else {
          noveZdroje.push({ id, nazev: f.name, bytes, typ: "obrazek" });
          noveStranky.push({
            id: noveId("str"),
            zdrojId: id,
            indexVeZdroji: 0,
            rotace: 0,
            format: { format: "A4", orientace: "vyska", rezim: "vejit" },
          });
        }
      }
      onPridat(noveZdroje, noveStranky, noveRozbory);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : String(e));
    } finally {
      setNacitam(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setPretahuji(true);
        }}
        onDragLeave={() => setPretahuji(false)}
        onDrop={(e) => {
          e.preventDefault();
          setPretahuji(false);
          if (e.dataTransfer.files.length) zpracovat(e.dataTransfer.files);
        }}
        className="rounded-lg border-2 border-dashed p-10 text-center transition-colors"
        style={{
          borderColor: pretahuji ? "var(--modra)" : "var(--linka)",
          background: pretahuji ? "var(--modra-svetla)" : "var(--panel)",
        }}
      >
        <p className="text-base font-medium">
          Přetáhni sem PDF nebo obrázky
        </p>
        <Napoveda>
          Můžeš najednou i desítky souborů. Nikam se nenahrávají — všechno se
          zpracuje přímo v tomto prohlížeči.
        </Napoveda>
        <div className="mt-4">
          <Tlacitko varianta="hlavni" onClick={() => input.current?.click()}>
            {nacitam ? "Načítám…" : "Vybrat soubory"}
          </Tlacitko>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => e.target.files && zpracovat(e.target.files)}
        />
      </div>

      {chyba && (
        <Karta>
          <p className="text-sm" style={{ color: "var(--cervena)" }}>
            {chyba}
          </p>
        </Karta>
      )}

      {zdroje.map((z) => {
        const r = rozbory[z.id];
        const prilis = z.bytes.length > PORTAL_LIMITS.prilohaSoubor;
        return (
          <Karta key={z.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{z.nazev}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
                  {r
                    ? `PDF ${r.verzePdf ?? "?"} · ${r.pocetStran} ${stranMnozne(r.pocetStran)} · ${r.strankyMm[0]?.sirka}×${r.strankyMm[0]?.vyska} mm · ${formatBytes(z.bytes.length)}`
                    : `obrázek · ${formatBytes(z.bytes.length)}`}
                  {r?.creator ? ` · ${r.creator}` : ""}
                </p>
              </div>
              <Tlacitko varianta="tiche" onClick={() => onOdebrat(z.id)}>
                Odebrat
              </Tlacitko>
            </div>

            {prilis && (
              <p className="mt-3 text-xs" style={{ color: "var(--oranzova)" }}>
                Soubor přesahuje 100 MB — jako přílohu žádosti ho portál
                nepřijme. Do složky Dokumentace ano (tam limit na jeden soubor
                není).
              </p>
            )}

            {r && (
              <ul className="mt-3 border-t pt-2" style={{ borderColor: "var(--linka)" }}>
                {r.nalezy.map((n) => (
                  <Radek key={n.klic} stav={n.stav} popis={n.popis} detail={n.detail} />
                ))}
              </ul>
            )}
          </Karta>
        );
      })}
    </div>
  );
}

function stranMnozne(n: number) {
  if (n === 1) return "strana";
  if (n >= 2 && n <= 4) return "strany";
  return "stran";
}
