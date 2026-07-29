import type { Stranka, Zdroj } from "./pdf/compose";
import type { Rozbor } from "./pdf/inspect";
import type { ProfilId } from "./gs/profiles";

export const KROKY = [
  { id: 1, nazev: "Zdroje", popis: "Nahraj PDF nebo obrázky" },
  { id: 2, nazev: "Stránky", popis: "Pořadí, otočení, mazání" },
  { id: 3, nazev: "Formát listu", popis: "Papír a měřítko" },
  { id: 4, nazev: "Cílový formát", popis: "PDF/A-3 pro portál" },
  { id: 5, nazev: "Kontrola", popis: "Před podáním" },
] as const;

export interface StavAplikace {
  krok: number;
  zdroje: Zdroj[];
  stranky: Stranka[];
  profil: ProfilId;
  /** Rozbor vstupních souborů, klíčem je id zdroje. */
  rozbory: Record<string, Rozbor>;
  /** Hotový výstup. */
  vystup: { bytes: Uint8Array; nazev: string; rozbor: Rozbor } | null;
}

let citac = 0;
export function noveId(prefix: string): string {
  citac += 1;
  return `${prefix}-${citac}`;
}
