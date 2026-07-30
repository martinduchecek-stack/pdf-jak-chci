"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KrokZdroje } from "@/components/KrokZdroje";
import { KrokStranky } from "@/components/KrokStranky";
import { KrokFormat } from "@/components/KrokFormat";
import { KrokProfil } from "@/components/KrokProfil";
import { KrokKontrola } from "@/components/KrokKontrola";
import { KrokBalicek } from "@/components/KrokBalicek";
import { KrokDavka } from "@/components/KrokDavka";
import { Tlacitko } from "@/components/Ui";
import type { PolozkaBalicku } from "@/lib/portal/balicek";
import type { SlozkaId } from "@/lib/portal/spec";
import {
  prevestDavku,
  type PrubehDavky,
  type VysledekDavky,
} from "@/lib/portal/davka";
import { krokyProRezim, noveId, type Rezim } from "@/lib/stav";
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

export default function Domu() {
  // Dávka je výchozí: na portál se výkresy vkládají jednotlivě, takže
  // slučování do jednoho PDF je ten vzácnější případ.
  const [rezim, setRezim] = useState<Rezim>("davka");
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
  const [balicek, setBalicek] = useState<PolozkaBalicku[]>([]);
  const [davka, setDavka] = useState<VysledekDavky[]>([]);
  const [prubeh, setPrubeh] = useState<PrubehDavky | null>(null);
  const zastavitRef = useRef(false);

  const kroky = krokyProRezim(rezim);
  const poradiKroku = Math.max(
    0,
    kroky.findIndex((k) => k.id === krok),
  );

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
      // -dUseCropBox posíláme jen při ořezu — jinak by Ghostscript zbytečně
      // přepsal MediaBox u stránek, kterých se ořez netýká.
      const jeOrez = stranky.some((s) => s.orez);
      const { data } = await prevest(slozeno.bytes, p, { orez: jeOrez });

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

  async function spustitDavku() {
    setBezi(true);
    setChyba(null);
    setDavka([]);
    zastavitRef.current = false;
    try {
      const vysledky = await prevestDavku(
        zdroje,
        profilById(profil),
        setPrubeh,
        () => zastavitRef.current,
      );
      setDavka(vysledky);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : String(e));
    } finally {
      setBezi(false);
      setPrubeh(null);
    }
  }

  function pridatVysledekDoBalicku(v: VysledekDavky, slozka: SlozkaId) {
    if (!v.bytes) return;
    const bytes = v.bytes;
    setBalicek((p) => [
      ...p,
      {
        id: noveId("bal"),
        nazev: v.nazev,
        bytes,
        slozka,
        zdrojId: v.zdrojId,
        jePdfa3: v.rozbor?.pdfaPart === "3" && !!v.rozbor?.maOutputIntent,
      },
    ]);
  }

  function pridatDoBalicku(slozka: SlozkaId) {
    if (!vystup) return;
    const r = vystup.rozbor;
    setBalicek((p) => [
      ...p,
      {
        id: noveId("bal"),
        nazev: vystup.nazev,
        bytes: vystup.bytes,
        slozka,
        jePdfa3: r.pdfaPart === "3" && r.maOutputIntent,
      },
    ]);
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
            Převod do PDF/A-3 pro Portál stavebníka — dávkově i po jednom.
            Všechno se počítá v tomto prohlížeči, soubory se nikam nenahrávají.
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            {
              id: "davka" as Rezim,
              nazev: "Dávka souborů",
              popis: "Každé PDF zvlášť — na výstupu stejný počet souborů",
            },
            {
              id: "dokument" as Rezim,
              nazev: "Jeden dokument",
              popis: "Spojit zdroje, přeskládat stránky, ořezat",
            },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRezim(r.id);
              setKrok(1);
              setVystup(null);
              setDavka([]);
            }}
            className="min-w-56 flex-1 rounded-lg border p-3 text-left"
            style={{
              borderColor: rezim === r.id ? "var(--modra)" : "var(--linka)",
              borderWidth: rezim === r.id ? 2 : 1,
              background:
                rezim === r.id ? "var(--modra-svetla)" : "var(--panel)",
            }}
          >
            <p className="text-sm font-semibold">{r.nazev}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--tlumeny)" }}>
              {r.popis}
            </p>
          </button>
        ))}
      </div>

      <nav className="mt-4 flex flex-wrap gap-2">
        {kroky.map((k) => {
          const aktivni = k.id === krok;
          // Balíček zůstává přístupný i po odebrání zdrojů — hotové soubory
          // v něm nemají zmizet jen proto, že uživatel začal další dokument.
          const dostupny =
            k.id === 1 || zdroje.length > 0 || (k.id === 6 && balicek.length > 0);
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
            rozbory={rozbory}
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
              setDavka([]);
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
            onPridatDoBalicku={pridatDoBalicku}
            jeVBalicku={
              !!vystup && balicek.some((b) => b.nazev === vystup.nazev)
            }
          />
        )}
        {krok === 6 && (
          <KrokBalicek
            polozky={balicek}
            onOdebrat={(id) =>
              setBalicek((p) => p.filter((b) => b.id !== id))
            }
          />
        )}
        {krok === 7 && (
          <KrokDavka
            pocetZdroju={zdroje.length}
            profil={profil}
            bezi={bezi}
            prubeh={prubeh}
            vysledky={davka}
            onSpustit={spustitDavku}
            onZastavit={() => {
              zastavitRef.current = true;
            }}
            onPridatDoBalicku={pridatVysledekDoBalicku}
            jeVBalicku={(v) => balicek.some((b) => b.zdrojId === v.zdrojId)}
          />
        )}
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Tlacitko
          onClick={() => setKrok(kroky[Math.max(0, poradiKroku - 1)].id)}
          disabled={poradiKroku === 0}
        >
          Zpět
        </Tlacitko>
        {poradiKroku < kroky.length - 1 && (
          <Tlacitko
            varianta="hlavni"
            onClick={() => setKrok(kroky[poradiKroku + 1].id)}
            disabled={zdroje.length === 0}
            title={zdroje.length ? undefined : "Nejdřív nahraj soubor"}
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
