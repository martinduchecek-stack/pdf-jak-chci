/**
 * Cílové PDF profily.
 *
 * POZOR: Ghostscript (pdfwrite) umí vyrobit pouze konformitu úrovně **B**
 * (PDF/A-1b, -2b, -3b). Úroveň "u" (zaručená mapa na Unicode) ani "a"
 * (tagovaná struktura) přes pdfwrite dosáhnout nelze — proto je zde
 * nenabízíme, aby aplikace neslibovala něco, co nesplní.
 */

export type ProfilId =
  | "portal-pdfa3b"
  | "pdfa2b"
  | "pdfa1b"
  | "pdf17"
  | "datova-schranka"
  | "tisk";

export interface Profil {
  id: ProfilId;
  nazev: string;
  podtitul: string;
  /** Zvýrazněný profil pro Portál stavebníka. */
  doporuceno?: boolean;
  /** Právní opora, zobrazuje se u profilu. */
  opora?: string;
  /** Varování, která uživatel uvidí PŘED převodem. */
  varovani?: string[];
  /** Argumenty pro Ghostscript (bez -sOutputFile a vstupu). */
  gsArgs: string[];
  /** Číslo části PDF/A (1–3), nebo null pro běžné PDF. */
  pdfaPart: 1 | 2 | 3 | null;
  /** Cílová velikost v bajtech, pokud profil komprimuje. */
  cilovaVelikost?: number;
}

const ZAKLAD = ["-dBATCH", "-dNOPAUSE", "-dNOOUTERSAVE", "-sDEVICE=pdfwrite"];

/** Společné pro všechny PDF/A výstupy. */
function pdfa(part: 1 | 2 | 3, extra: string[] = []): string[] {
  return [
    ...ZAKLAD,
    `-dPDFA=${part}`,
    // MUSÍ být device colour. UseDeviceIndependentColor způsobí, že Ghostscript
    // PDF/A režim tiše zahodí a vyrobí obyčejné PDF s klamavými XMP metadaty.
    "-sColorConversionStrategy=RGB",
    // 1 = vynech operaci, která by konformitu porušila, a pokračuj
    "-dPDFACompatibilityPolicy=1",
    ...extra,
  ];
}

export const PROFILY: Profil[] = [
  {
    id: "portal-pdfa3b",
    nazev: "Portál stavebníka",
    podtitul: "PDF/A-3B — formát požadovaný pro podání dokumentace",
    doporuceno: true,
    opora:
      "vyhláška č. 190/2024 Sb., příloha č. 4 — výkresy i ostatní dokumenty: PDF/A-3",
    pdfaPart: 3,
    gsArgs: pdfa(3),
  },
  {
    id: "datova-schranka",
    nazev: "Do datové schránky",
    podtitul: "PDF/A-3B se zmenšením pod 100 MB",
    opora: "§ 5 vyhl. č. 194/2009 Sb. — max. velikost datové zprávy 100 MB",
    pdfaPart: 3,
    cilovaVelikost: 100 * 1024 * 1024,
    gsArgs: pdfa(3, [
      "-dDownsampleColorImages=true",
      "-dColorImageResolution=200",
      "-dDownsampleGrayImages=true",
      "-dGrayImageResolution=200",
      "-dDownsampleMonoImages=true",
      "-dMonoImageResolution=600",
    ]),
    varovani: [
      "Rastrové obrázky se převzorkují na 200 dpi. U výkresů s jemnou kresbou zkontroluj čitelnost.",
    ],
  },
  {
    id: "pdfa2b",
    nazev: "PDF/A-2B",
    podtitul: "Archivní formát bez možnosti vkládat přílohy",
    pdfaPart: 2,
    gsArgs: pdfa(2),
    varovani: [
      "Portál stavebníka požaduje PDF/A-3. Tento profil použij jen tam, kde ho výslovně žádá jiný úřad.",
    ],
  },
  {
    id: "pdfa1b",
    nazev: "PDF/A-1B",
    podtitul: "Nejpřísnější archivní formát (ISO 19005-1)",
    pdfaPart: 1,
    gsArgs: pdfa(1),
    varovani: [
      "PDF/A-1 zakazuje vrstvy (OCG) i průhlednost. Výkresy z Archicadu obojí běžně obsahují — Ghostscript je odstraní a vzhled se může změnit.",
      "Portál stavebníka požaduje PDF/A-3, ne A-1.",
    ],
  },
  {
    id: "pdf17",
    nazev: "Běžné PDF 1.7",
    podtitul: "Bez archivní konformity — pro běžné sdílení",
    pdfaPart: null,
    gsArgs: [...ZAKLAD, "-dCompatibilityLevel=1.7"],
    varovani: ["Tento soubor portál stavebníka nepřijme."],
  },
  {
    id: "tisk",
    nazev: "Pro tisk",
    podtitul: "Bez převzorkování obrázků, plné rozlišení",
    pdfaPart: null,
    gsArgs: [
      ...ZAKLAD,
      "-dCompatibilityLevel=1.7",
      "-dDownsampleColorImages=false",
      "-dDownsampleGrayImages=false",
      "-dDownsampleMonoImages=false",
      "-dAutoFilterColorImages=false",
      "-dColorImageFilter=/FlateEncode",
    ],
    varovani: ["Tento soubor portál stavebníka nepřijme."],
  },
];

export function profilById(id: ProfilId): Profil {
  const p = PROFILY.find((x) => x.id === id);
  if (!p) throw new Error(`Neznámý profil: ${id}`);
  return p;
}
