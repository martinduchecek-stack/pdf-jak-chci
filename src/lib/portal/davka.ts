import JSZip from "jszip";
import { prevest } from "@/lib/gs/client";
import type { Profil } from "@/lib/gs/profiles";
import { rozeber, type Rozbor } from "@/lib/pdf/inspect";
import { slozit, type Zdroj } from "@/lib/pdf/compose";
import { opravitPoPrevodu } from "@/lib/pdf/pdfaOprava";
import { noveId } from "@/lib/stav";
import { unikatniNazev } from "./nazvy";

export interface VysledekDavky {
  zdrojId: string;
  /** Název pod kterým se výsledek uloží. */
  nazev: string;
  bytes?: Uint8Array;
  rozbor?: Rozbor;
  chyba?: string;
  ms?: number;
}

export interface PrubehDavky {
  hotovo: number;
  celkem: number;
  prave: string;
}

/**
 * Převede každý zdroj samostatně. Běží po jednom, ne paralelně: Ghostscript ve
 * WASM si pro každý běh alokuje vlastní paměť a několik velkých výkresů naráz
 * by prohlížeč položilo.
 */
export async function prevestDavku(
  zdroje: Zdroj[],
  profil: Profil,
  onPrubeh: (p: PrubehDavky) => void,
  zastavit: () => boolean,
): Promise<VysledekDavky[]> {
  const vysledky: VysledekDavky[] = [];

  for (const [i, z] of zdroje.entries()) {
    if (zastavit()) break;
    onPrubeh({ hotovo: i, celkem: zdroje.length, prave: z.nazev });

    const nazev = vystupniNazev(z.nazev, profil);
    try {
      // Ghostscript bere na vstupu jen PDF, obrázek je proto potřeba nejdřív
      // vložit na stránku.
      const vstup =
        z.typ === "obrazek" ? await obrazekNaPdf(z) : z.bytes;
      const { data, ms } = await prevest(vstup, profil);
      const { bytes } = await opravitPoPrevodu(data);
      vysledky.push({
        zdrojId: z.id,
        nazev,
        bytes,
        rozbor: await rozeber({ name: nazev, bytes }),
        ms,
      });
    } catch (e) {
      vysledky.push({
        zdrojId: z.id,
        nazev,
        chyba: e instanceof Error ? e.message : String(e),
      });
    }
  }

  onPrubeh({ hotovo: vysledky.length, celkem: zdroje.length, prave: "" });
  return vysledky;
}

/** Obrázek vloží na list A4 tak, aby se celý vešel. */
async function obrazekNaPdf(z: Zdroj): Promise<Uint8Array> {
  const { bytes } = await slozit(
    [z],
    [
      {
        id: noveId("str"),
        zdrojId: z.id,
        indexVeZdroji: 0,
        rotace: 0,
        format: { format: "A4", orientace: "vyska", rezim: "vejit" },
      },
    ],
  );
  return bytes;
}

/** Zachová původní název, jen doplní příponu podle profilu. */
export function vystupniNazev(puvodni: string, profil: Profil): string {
  const zaklad = puvodni.replace(/\.(pdf|jpe?g|png|tiff?)$/i, "");
  const pripona = profil.pdfaPart ? `_PDFA-${profil.pdfaPart}b` : "_upraveno";
  return `${zaklad}${pripona}.pdf`;
}

/** Zabalí úspěšně převedené soubory do jednoho plochého archivu. */
export async function zabalitDavku(
  vysledky: VysledekDavky[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  const pouzite = new Set<string>();

  for (const v of vysledky) {
    if (!v.bytes) continue;
    zip.file(unikatniNazev(v.nazev, pouzite), v.bytes);
  }

  const nepovedene = vysledky.filter((v) => v.chyba);
  if (nepovedene.length) {
    zip.file(
      "_NEPREVEDENO.txt",
      [
        "Tyto soubory se nepodařilo převést:",
        "",
        ...nepovedene.map((v) => `${v.nazev}\n    ${v.chyba}`),
      ].join("\n"),
    );
  }

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 1 },
  });
}
