/** Znaky, které v názvech souborů v ZIPu (a na Windows) dělají potíže. */
export function bezpecnyNazev(n: string): string {
  return n.replace(/[/\\:*?"<>|]/g, "_");
}

/**
 * Vrátí název, který se v `pouzite` ještě nevyskytuje, a zaregistruje ho.
 *
 * Bez toho by se soubory se shodným názvem v archivu navzájem přepsaly
 * a část dávky by se tiše ztratila.
 */
export function unikatniNazev(nazev: string, pouzite: Set<string>): string {
  const puvodni = bezpecnyNazev(nazev);
  let vysledek = puvodni;
  for (let i = 2; pouzite.has(vysledek); i++) {
    vysledek = puvodni.replace(/(\.[^.]+)?$/, (p) => `_${i}${p || ""}`);
  }
  pouzite.add(vysledek);
  return vysledek;
}
