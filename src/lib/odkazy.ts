/** Odkaz na zdrojový kód. AGPL v čl. 13 vyžaduje, aby byl dostupný i z aplikace. */
export const ZDROJOVY_KOD =
  "https://github.com/martinduchecek-stack/pdf-jak-chci";

/**
 * Údaje pro dobrovolný příspěvek.
 *
 * QR kód se generuje skriptem `node scripts/qr-dar.mjs` do `public/qr-dar.svg`;
 * po změně čísla účtu je nutné ho spustit znovu, jinak by QR ukazoval na starý
 * účet.
 */
export const DAR = {
  /** U daru stačí k identifikaci jméno — IČO by navozovalo dojem platby podnikateli. */
  prijemce: "Ing. Martin Ducheček",
  ucet: "1793428035/3030",
  iban: "CZ87 3030 0000 0017 9342 8035",
  qr: "/qr-dar.svg",
} as const;
