import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";

/**
 * Doplní do PDF drobnosti, které Ghostscript neopraví a kvůli kterým by soubor
 * neprošel validací podle ISO 19005.
 *
 * Zatím jde o jedinou věc, zato u výkresů z Archicadu o naprosto pravidelnou:
 *
 * ISO 19005-3, klauzule 6.9 vyžaduje, aby konfigurační slovník vrstev — tedy
 * hodnota klíče /D a každá položka pole /Configs ve slovníku /OCProperties —
 * obsahoval klíč /Name. Archicad ho nezapisuje a Ghostscript ho propouští dál,
 * takže výstup jinak spolehlivě selže na jediném pravidle. Ověřeno veraPDF:
 * bez doplnění FAIL, s doplněním PASS, vzhled bitově shodný.
 *
 * Soubor přepisujeme jen tehdy, když je opravdu co opravit — zbytečný průchod
 * pdf-libem by u hotového PDF/A byl zbytečné riziko.
 */
export async function opravitPoPrevodu(
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; opraveno: string[] }> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
  } catch {
    // Když se soubor nepodaří otevřít, vracíme ho beze změny — převod jako
    // takový proběhl a rozbíjet ho kvůli kosmetice nemá smysl.
    return { bytes, opraveno: [] };
  }

  const ocp = doc.context.lookupMaybe(
    doc.catalog.get(PDFName.of("OCProperties")),
    PDFDict,
  );
  if (!ocp) return { bytes, opraveno: [] };

  const opraveno: string[] = [];
  const doplnitNazev = (cfg: PDFDict | undefined, popis: string) => {
    if (!cfg || cfg.get(PDFName.of("Name")) !== undefined) return;
    // Hex string s UTF-16 — u literálního zápisu by se diakritika rozsypala.
    cfg.set(PDFName.of("Name"), PDFHexString.fromText("Výchozí"));
    opraveno.push(popis);
  };

  doplnitNazev(
    doc.context.lookupMaybe(ocp.get(PDFName.of("D")), PDFDict),
    "výchozí konfigurace vrstev",
  );

  const configs = doc.context.lookupMaybe(
    ocp.get(PDFName.of("Configs")),
    PDFArray,
  );
  if (configs) {
    for (let i = 0; i < configs.size(); i++) {
      doplnitNazev(
        doc.context.lookupMaybe(configs.get(i), PDFDict),
        `konfigurace vrstev ${i + 1}`,
      );
    }
  }

  if (opraveno.length === 0) return { bytes, opraveno: [] };

  // Bez objektových streamů — u PDF/A je to bezpečnější a soubor zůstane
  // čitelný i nástroji, které je nezvládají.
  return {
    bytes: await doc.save({ useObjectStreams: false }),
    opraveno,
  };
}
