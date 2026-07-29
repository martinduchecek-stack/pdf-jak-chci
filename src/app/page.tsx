"use client";

import { useCallback, useEffect, useState } from "react";
import { KrokZdroje } from "@/components/KrokZdroje";
import { KrokStranky } from "@/components/KrokStranky";
import { KrokFormat } from "@/components/KrokFormat";
import { KrokProfil } from "@/components/KrokProfil";
import { KrokKontrola } from "@/components/KrokKontrola";
import { Tlacitko } from "@/components/Ui";
import {
  slozit,
  ztratiVrstvy,
  type Stranka,
  type Zdroj,
} from "@/lib/pdf/compose";
import { rozeber, type Rozbor } from "@/lib/pdf/inspect";
import { zapomenout } from "@/lib/pdf/render";
import { predehrat, prevest } from "@/lib/gs/client";
import { profilById, type ProfilId } from "@/lib/gs/profiles";
import { KROKY } from "@/lib/stav";

export default function Domu() {
  const [krok, setKrok] = useState(1);
  const [zdroje, setZdroje] = useState<Zdroj[]>([]);
  const [stranky, setStranky] = useState<Stranka[]>([]);
  const [rozbory, setRozbory] = useState<Record<string, Rozbor>>({});
  const [profil, setProfil] = useState<ProfilId>("portal-pdfa3b");
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [zmenaMeritka, setZmenaMeritka] = useState<
    { stranka: number; faktor: number }[]
  >([]);
  const [vystup, setVystup] = useState<{
    bytes: Uint8Array;
    nazev: string;
    rozbor: Rozbor;
  } | null>(null);

  // Ghostscript načteme na pozadí, jakmile má uživatel co převádět.
  useEffect(() => {
    if (zdroje.length) predehrat();
  }, [zdroje.length]);

  const pridat = useCallback(
    (z: Zdroj[], s: Stranka[], r: Record<string, Rozbor>) => {
      setZdroje((p) => [...p, ...z]);
      setStranky((p) => [...p, ...s]);
      setRozbory((p) => ({ ...p, ...r }));
      setVystup(null);
    },
    [],
  );

  const odebrat = useCallback((id: string) => {
    zapomenout(id);
    setZdroje((p) => p.filter((z) => z.id !== id));
    setStranky((p) => p.filter((s) => s.zdrojId !== id));
    setRozbory((p) => {
      const kopie = { ...p };
      delete kopie[id];
      return kopie;
    });
    setVystup(null);
  }, []);

  async function spustit() {
    setBezi(true);
    setChyba(null);
    try {
      const slozeno = await slozit(zdroje, stranky);
      setZmenaMeritka(slozeno.zmenaMeritka);

      const p = profilById(profil);
      const { data } = await prevest(slozeno.bytes, p);

      const zaklad = zdroje[0]?.nazev.replace(/\.pdf$/i, "") ?? "dokumentace";
      const pripona = p.pdfaPart ? `_PDFA-${p.pdfaPart}b` : "_upraveno";
      const nazev = `${zaklad}${pripona}.pdf`;

      setVystup({
        bytes: data,
        nazev,
        rozbor: await rozeber({ name: nazev, bytes: data }),
      });
    } catch (e) {
      setChyba(e instanceof Error ? e.message : String(e));
    } finally {
      setBezi(false);
    }
  }

  function stahnout() {
    if (!vystup) return;
    const blob = new Blob([vystup.bytes.slice()], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = vystup.nazev;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <header
        className="relative overflow-hidden rounded-lg border p-6"
        style={{ borderColor: "var(--linka)", background: "var(--panel)" }}
      >
        <div className="raster pointer-events-none absolute inset-0 opacity-[0.18]" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">Pdf jak chci</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tlumeny)" }}>
            Převod do PDF/A-3 pro Portál stavebníka, skládání a úpravy
            dokumentace. Všechno se počítá v tomto prohlížeči — soubory se nikam
            nenahrávají.
          </p>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {KROKY.map((k) => {
          const aktivni = k.id === krok;
          const dostupny = k.id === 1 || stranky.length > 0;
          return (
            <button
              key={k.id}
              type="button"
              disabled={!dostupny}
              onClick={() => setKrok(k.id)}
              className="rounded-md border px-3 py-2 text-left text-xs disabled:opacity-40"
              style={{
                borderColor: aktivni ? "var(--modra)" : "var(--linka)",
                background: aktivni ? "var(--modra-svetla)" : "var(--panel)",
              }}
            >
              <span className="font-semibold">
                {k.id}. {k.nazev}
              </span>
              <span className="block" style={{ color: "var(--tlumeny)" }}>
                {k.popis}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="mt-6">
        {krok === 1 && (
          <KrokZdroje
            zdroje={zdroje}
            rozbory={rozbory}
            onPridat={pridat}
            onOdebrat={odebrat}
          />
        )}
        {krok === 2 && (
          <KrokStranky
            zdroje={zdroje}
            stranky={stranky}
            onZmena={(s) => {
              setStranky(s);
              setVystup(null);
            }}
          />
        )}
        {krok === 3 && (
          <KrokFormat
            stranky={stranky}
            onZmena={(s) => {
              setStranky(s);
              setVystup(null);
            }}
          />
        )}
        {krok === 4 && (
          <KrokProfil
            vybrany={profil}
            onZmena={(p) => {
              setProfil(p);
              setVystup(null);
            }}
          />
        )}
        {krok === 5 && (
          <KrokKontrola
            bezi={bezi}
            chyba={chyba}
            profil={profil}
            ztratiVrstvy={ztratiVrstvy(zdroje, stranky)}
            zmenaMeritka={zmenaMeritka}
            vystup={vystup}
            onSpustit={spustit}
            onStahnout={stahnout}
          />
        )}
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Tlacitko
          onClick={() => setKrok((k) => Math.max(1, k - 1))}
          disabled={krok === 1}
        >
          Zpět
        </Tlacitko>
        {krok < KROKY.length && (
          <Tlacitko
            varianta="hlavni"
            onClick={() => setKrok((k) => k + 1)}
            disabled={stranky.length === 0}
            title={stranky.length ? undefined : "Nejdřív nahraj soubor"}
          >
            Pokračovat
          </Tlacitko>
        )}
      </div>

      <footer
        className="mt-10 border-t pt-5 text-xs leading-relaxed"
        style={{ borderColor: "var(--linka)", color: "var(--tlumeny)" }}
      >
        <p>
          Požadavky vycházejí z vyhlášky č. 190/2024 Sb. (přílohy č. 3 a 4) a
          Uživatelské dokumentace Portálu stavební správy v1.13.
        </p>
        <p className="mt-1">
          Kontrola v této aplikaci pokrývá nejčastější příčiny odmítnutí, ale
          není to plná validace podle ISO 19005. Definitivní verdikt dá veraPDF
          nebo samotný portál.
        </p>
      </footer>
    </main>
  );
}
