import { degrees, PDFDocument, type PDFPage } from "pdf-lib";

const MM = 72 / 25.4;

/** Formáty papíru v mm, na výšku. */
export const FORMATY_PAPIRU = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
} as const;

export type FormatPapiru = keyof typeof FORMATY_PAPIRU;
export type Orientace = "vyska" | "sirka";

/** Jak se původní stránka umístí na nový list. */
export type RezimUmisteni =
  /** Zmenší/zvětší tak, aby se celá vešla. Mění měřítko výkresu. */
  | "vejit"
  /** Vyplní list, přebytek se ořízne. Mění měřítko výkresu. */
  | "vyplnit"
  /** Nemění velikost kresby, jen ji vycentruje. Měřítko zůstává. */
  | "zachovat";

export interface Zdroj {
  id: string;
  nazev: string;
  bytes: Uint8Array;
  typ: "pdf" | "obrazek";
}

/** Jedna stránka ve výsledném dokumentu. */
export interface Stranka {
  id: string;
  zdrojId: string;
  /** Index stránky ve zdrojovém PDF; u obrázku vždy 0. */
  indexVeZdroji: number;
  /** Otočení přidané uživatelem, ve stupních (0/90/180/270). */
  rotace: number;
  /** Ořez v poměrné části stránky (0–1), měřeno od levého horního rohu. */
  orez?: { x: number; y: number; sirka: number; vyska: number };
  /** Cílový formát listu; null = ponechat původní rozměr. */
  format?: { format: FormatPapiru; orientace: Orientace; rezim: RezimUmisteni };
}

export interface VysledekSkladani {
  bytes: Uint8Array;
  /** Stránky, u kterých se změnilo měřítko kresby. */
  zmenaMeritka: { stranka: number; faktor: number }[];
}

function rozmeryBodu(
  format: FormatPapiru,
  orientace: Orientace,
): [number, number] {
  const [w, h] = FORMATY_PAPIRU[format];
  const [sirka, vyska] = orientace === "sirka" ? [h, w] : [w, h];
  return [sirka * MM, vyska * MM];
}

/**
 * Zjistí, že se s jediným zdrojovým PDF nic nedělá — všechny jeho stránky jsou
 * v původním pořadí, bez rotace, ořezu i změny formátu.
 *
 * V takovém případě se vyplatí pdf-lib úplně obejít a poslat Ghostscriptu
 * původní bajty: `copyPages()` totiž nepřenáší katalogové položky jako
 * /OCProperties, takže by se cestou ztratily vrstvy výkresu.
 */
export function jeBezeZmeny(zdroje: Zdroj[], stranky: Stranka[]): boolean {
  if (zdroje.length !== 1) return false;
  const z = zdroje[0];
  if (z.typ !== "pdf") return false;
  return stranky.every(
    (s, i) =>
      s.zdrojId === z.id &&
      s.indexVeZdroji === i &&
      !s.rotace &&
      !s.orez &&
      !s.format,
  );
}

/** Přeskládání přes pdf-lib zahodí vrstvy — na to je potřeba upozornit. */
export function ztratiVrstvy(zdroje: Zdroj[], stranky: Stranka[]): boolean {
  return !jeBezeZmeny(zdroje, stranky);
}

/**
 * Sestaví výsledný dokument. Vrací i seznam stránek, u kterých se změnilo
 * měřítko — u výkresů s kótami je to podstatná informace.
 */
export async function slozit(
  zdroje: Zdroj[],
  stranky: Stranka[],
): Promise<VysledekSkladani> {
  // Nic se nemění → původní soubor pošleme dál beze změny, ať se nic neztratí.
  if (jeBezeZmeny(zdroje, stranky)) {
    return { bytes: zdroje[0].bytes, zmenaMeritka: [] };
  }

  const cil = await PDFDocument.create();
  const zmenaMeritka: { stranka: number; faktor: number }[] = [];

  // Zdrojové dokumenty načteme jen jednou, i když z nich bereme víc stránek.
  const nactene = new Map<string, PDFDocument>();
  for (const z of zdroje) {
    if (z.typ === "pdf") {
      nactene.set(
        z.id,
        await PDFDocument.load(z.bytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
        }),
      );
    }
  }

  for (const [i, s] of stranky.entries()) {
    const zdroj = zdroje.find((z) => z.id === s.zdrojId);
    if (!zdroj) continue;

    if (zdroj.typ === "obrazek") {
      await pridatObrazek(cil, zdroj, s);
      continue;
    }

    const src = nactene.get(zdroj.id)!;
    const [kopie] = await cil.copyPages(src, [s.indexVeZdroji]);

    aplikovatOrez(kopie, s);

    if (s.rotace) {
      kopie.setRotation(degrees((kopie.getRotation().angle + s.rotace) % 360));
    }

    if (!s.format) {
      cil.addPage(kopie);
      continue;
    }

    // Přesazení na jiný formát listu: původní stránku vložíme jako objekt
    // a vykreslíme ji na nový list.
    //
    // embedPage() bez ohraničení bere MediaBox a ořez by tiše zahodil, takže
    // hranice předáváme výslovně. getCropBox() vrací při chybějícím ořezu
    // rovnou MediaBox, proto to funguje i pro needitované stránky.
    const cb = kopie.getCropBox();
    const [cw, ch] = rozmeryBodu(s.format.format, s.format.orientace);
    const vlozena = await cil.embedPage(kopie, {
      left: cb.x,
      bottom: cb.y,
      right: cb.x + cb.width,
      top: cb.y + cb.height,
    });
    const pw = vlozena.width;
    const ph = vlozena.height;

    let meritko = 1;
    if (s.format.rezim === "vejit") meritko = Math.min(cw / pw, ch / ph);
    else if (s.format.rezim === "vyplnit") meritko = Math.max(cw / pw, ch / ph);

    const list = cil.addPage([cw, ch]);
    list.drawPage(vlozena, {
      x: (cw - pw * meritko) / 2,
      y: (ch - ph * meritko) / 2,
      xScale: meritko,
      yScale: meritko,
    });

    if (Math.abs(meritko - 1) > 0.001) {
      zmenaMeritka.push({ stranka: i + 1, faktor: meritko });
    }
  }

  return { bytes: await cil.save(), zmenaMeritka };
}

function aplikovatOrez(stranka: PDFPage, s: Stranka) {
  if (!s.orez) return;
  const media = stranka.getMediaBox();
  // Ořez zadává uživatel od levého horního rohu, PDF počítá zdola.
  stranka.setCropBox(
    media.x + s.orez.x * media.width,
    media.y + (1 - s.orez.y - s.orez.vyska) * media.height,
    s.orez.sirka * media.width,
    s.orez.vyska * media.height,
  );
}

async function pridatObrazek(cil: PDFDocument, zdroj: Zdroj, s: Stranka) {
  const jePng = zdroj.bytes[0] === 0x89 && zdroj.bytes[1] === 0x50;
  const img = jePng
    ? await cil.embedPng(zdroj.bytes)
    : await cil.embedJpg(zdroj.bytes);

  const [cw, ch] = s.format
    ? rozmeryBodu(s.format.format, s.format.orientace)
    : [img.width, img.height];

  const list = cil.addPage([cw, ch]);
  const meritko =
    s.format?.rezim === "vyplnit"
      ? Math.max(cw / img.width, ch / img.height)
      : Math.min(cw / img.width, ch / img.height);

  list.drawImage(img, {
    x: (cw - img.width * meritko) / 2,
    y: (ch - img.height * meritko) / 2,
    width: img.width * meritko,
    height: img.height * meritko,
  });
  if (s.rotace) list.setRotation(degrees(s.rotace % 360));
}
