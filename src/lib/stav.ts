/** Jeden dokument skládaný ze zdrojů, nebo dávka převedená po jednom. */
export type Rezim = "dokument" | "davka";

export interface Krok {
  id: number;
  nazev: string;
  popis: string;
}

const KROKY_DOKUMENT: Krok[] = [
  { id: 1, nazev: "Zdroje", popis: "Nahraj PDF nebo obrázky" },
  { id: 2, nazev: "Stránky", popis: "Pořadí, otočení, ořez" },
  { id: 3, nazev: "Formát listu", popis: "Papír a měřítko" },
  { id: 4, nazev: "Cílový formát", popis: "PDF/A-3 pro portál" },
  { id: 5, nazev: "Kontrola", popis: "Před podáním" },
  { id: 6, nazev: "Balíček", popis: "Struktura A–E pro portál" },
];

/**
 * V dávce se stránky nepřeskládávají ani nemění formát listu — každý soubor
 * projde převodem sám za sebe, takže kroky 2 a 3 nedávají smysl.
 */
const KROKY_DAVKA: Krok[] = [
  { id: 1, nazev: "Zdroje", popis: "Nahraj klidně desítky PDF" },
  { id: 4, nazev: "Cílový formát", popis: "PDF/A-3 pro portál" },
  { id: 7, nazev: "Převod dávky", popis: "Každý soubor zvlášť" },
  { id: 6, nazev: "Balíček", popis: "Struktura A–E pro portál" },
];

export function krokyProRezim(rezim: Rezim): Krok[] {
  return rezim === "davka" ? KROKY_DAVKA : KROKY_DOKUMENT;
}

let citac = 0;
export function noveId(prefix: string): string {
  citac += 1;
  return `${prefix}-${citac}`;
}
