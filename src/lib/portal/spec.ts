/**
 * Požadavky Portálu stavební správy na vkládané soubory.
 *
 * Zdroje:
 *  - vyhláška č. 190/2024 Sb., přílohy č. 3 a 4
 *  - Portál stavební správy, Uživatelská dokumentace v1.13 (16. 12. 2025), kap. 4.6 a 4.7
 */

/** Limity portálu v bajtech. */
export const PORTAL_LIMITS = {
  /** Příloha žádosti — jeden soubor. */
  prilohaSoubor: 100 * 1024 * 1024,
  /** Přílohy žádosti — součet za jednu žádost. */
  prilohaCelkem: 1024 * 1024 * 1024,
  /** Dokumentace — součet za jeden záměr. */
  dokumentaceCelkem: 10 * 1024 * 1024 * 1024,
  /** Dokumentace — počet souborů. Limit na jeden soubor portál nestanoví. */
  dokumentacePocetSouboru: 50_000,
  /** Datová zpráva do datové schránky (vyhl. č. 194/2009 Sb.). */
  datovaSchranka: 100 * 1024 * 1024,
} as const;

export type SlozkaId =
  | "A"
  | "B"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "D"
  | "E";

export interface Slozka {
  id: SlozkaId;
  nazev: string;
  /** Prefix pro pojmenování souborů v exportovaném balíčku. */
  adresar: string;
  formaty: string;
  poznamka?: string;
}

/**
 * Pevná struktura dokumentace. Portál vyžaduje nahrát dokumentaci VŽDY celou,
 * i když se mění jen jeden dokument.
 */
export const STRUKTURA_DOKUMENTACE: Slozka[] = [
  {
    id: "A",
    nazev: "Průvodní list",
    adresar: "A_Pruvodni_list",
    formaty: "PDF/A",
    poznamka:
      "Povinná součást. XML se generuje automaticky jen tehdy, vyplní-li průvodní list projektant přímo v portálu (magic link). Nahraješ-li hotové PDF, žádné XML nevznikne.",
  },
  {
    id: "B",
    nazev: "Souhrnná technická zpráva",
    adresar: "B_Souhrnna_technicka_zprava",
    formaty: "PDF/A",
  },
  {
    id: "C1",
    nazev: "Situační výkres širších vztahů",
    adresar: "C_Situacni_vykresy/C1_Sirsi_vztahy",
    formaty: "PDF/A",
  },
  {
    id: "C2",
    nazev: "Katastrální situační výkres",
    adresar: "C_Situacni_vykresy/C2_Katastralni",
    formaty: "PDF/A",
  },
  {
    id: "C3",
    nazev: "Koordinační situační výkres",
    adresar: "C_Situacni_vykresy/C3_Koordinacni",
    formaty: "PDF/A",
  },
  {
    id: "C4",
    nazev: "Speciální výkresy",
    adresar: "C_Situacni_vykresy/C4_Specialni",
    formaty: "PDF/A",
  },
  {
    id: "C5",
    nazev: "Dělení nebo scelení pozemků",
    adresar: "C_Situacni_vykresy/C5_Deleni_sceleni",
    formaty: "PDF/A",
  },
  {
    id: "D",
    nazev: "Dokumentace objektů",
    adresar: "D_Dokumentace_objektu",
    formaty: "PDF/A",
  },
  {
    id: "E",
    nazev: "Dokladová část",
    adresar: "E_Dokladova_cast",
    formaty: "PDF/A a XML",
  },
];

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} kB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
