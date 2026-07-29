import JSZip from "jszip";
import { STRUKTURA_DOKUMENTACE, type SlozkaId } from "./spec";

export interface PolozkaBalicku {
  id: string;
  nazev: string;
  bytes: Uint8Array;
  slozka: SlozkaId;
  /** Výstup neprošel kontrolou jako PDF/A-3 — portál ho odmítne. */
  jePdfa3: boolean;
}

/**
 * Sestaví ZIP ve struktuře, kterou portál u dokumentace vyžaduje.
 *
 * Portál sám archiv nepřijímá — soubory se do jeho formuláře nahrávají po
 * složkách. Balíček slouží k tomu, aby bylo jasné, co kam patří, a aby se na
 * nic nezapomnělo: dokumentace se nahrává vždy celá.
 */
export async function sestavitZip(
  polozky: PolozkaBalicku[],
): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const s of STRUKTURA_DOKUMENTACE) {
    const patrici = polozky.filter((p) => p.slozka === s.id);
    const slozka = zip.folder(s.adresar);
    if (!slozka) continue;

    if (patrici.length === 0) {
      // Prázdné složky ZIP neuchová, a přitom je podstatné, aby bylo vidět,
      // která část dokumentace ještě chybí.
      slozka.file(
        "_CHYBI.txt",
        `Do této složky zatím nic nepatří.\n\n` +
          `${s.id} — ${s.nazev}\nPožadovaný formát: ${s.formaty}\n` +
          (s.poznamka ? `\n${s.poznamka}\n` : ""),
      );
      continue;
    }

    for (const p of patrici) {
      slozka.file(bezpecnyNazev(p.nazev), p.bytes);
    }
  }

  zip.file("_PRECTI_ME.txt", prehled(polozky));

  const blob = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    // PDF je už komprimované, vyšší úroveň by jen žrala čas.
    compressionOptions: { level: 1 },
  });
  return blob;
}

function bezpecnyNazev(n: string): string {
  return n.replace(/[/\\:*?"<>|]/g, "_");
}

function prehled(polozky: PolozkaBalicku[]): string {
  const radky: string[] = [
    "Balíček dokumentace pro Portál stavebníka",
    "vytvořeno aplikací Pdf jak chci",
    "",
    "Struktura odpovídá členění, které portál vyžaduje (části A–E).",
    "Dokumentace se do portálu nahrává VŽDY celá, i když se mění jediný dokument.",
    "",
    "Obsah:",
  ];

  for (const s of STRUKTURA_DOKUMENTACE) {
    const patrici = polozky.filter((p) => p.slozka === s.id);
    radky.push(`  ${s.id} — ${s.nazev} (${s.formaty})`);
    if (patrici.length === 0) {
      radky.push("      — zatím nic —");
    }
    for (const p of patrici) {
      radky.push(
        `      ${bezpecnyNazev(p.nazev)}${p.jePdfa3 ? "" : "   ⚠ NENÍ PDF/A-3"}`,
      );
    }
  }

  const vadne = polozky.filter((p) => !p.jePdfa3);
  if (vadne.length) {
    radky.push(
      "",
      "POZOR: následující soubory nejsou PDF/A-3 a portál je odmítne:",
      ...vadne.map((p) => `  ${p.nazev}`),
    );
  }

  radky.push(
    "",
    "Nezapomeň soubory opatřit elektronickým autorizačním razítkem",
    "(kvalifikovaný podpis + kvalifikované časové razítko) — až po převodu.",
  );

  return radky.join("\n");
}
