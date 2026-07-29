import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from "pdf-lib";

export type Zavaznost = "ok" | "varovani" | "chyba" | "info";

export interface Nalez {
  klic: string;
  popis: string;
  stav: Zavaznost;
  detail?: string;
}

export interface Rozbor {
  nazevSouboru: string;
  velikost: number;
  verzePdf: string | null;
  pocetStran: number;
  strankyMm: { sirka: number; vyska: number; rotace: number }[];
  pdfaPart: string | null;
  pdfaConformance: string | null;
  maOutputIntent: boolean;
  maXmp: boolean;
  sifrovano: boolean;
  podepsano: boolean;
  maJavaScript: boolean;
  maVrstvyOcg: boolean;
  nevlozeneFonty: string[];
  pocetFontu: number;
  producer: string | null;
  creator: string | null;
  nalezy: Nalez[];
  /** Soubor se nepodařilo přečíst. */
  chybaCteni?: string;
}

const BODY_NA_MM = 25.4 / 72;

/** XMP stream bývá nekomprimovaný, ale Ghostscript ho někdy zabalí Flate. */
function textZeStreamu(stream: PDFStream): string {
  if (!(stream instanceof PDFRawStream)) return "";
  const dekoduj = (b: Uint8Array) =>
    new TextDecoder("utf-8", { fatal: false }).decode(b);
  try {
    return dekoduj(decodePDFRawStream(stream).decode());
  } catch {
    try {
      return dekoduj(stream.asUint8Array());
    } catch {
      return "";
    }
  }
}

/** Projde řetěz font → descriptor a zjistí, zda je písmo vložené. */
function fontyBezVlozeni(doc: PDFDocument): {
  nevlozene: string[];
  celkem: number;
} {
  const nevlozene = new Set<string>();
  let celkem = 0;

  const resolve = (v: unknown): unknown =>
    v instanceof PDFRef ? doc.context.lookup(v) : v;

  const maFontFile = (fontDict: PDFDict): boolean => {
    const desc = resolve(fontDict.get(PDFName.of("FontDescriptor")));
    if (desc instanceof PDFDict) {
      for (const k of ["FontFile", "FontFile2", "FontFile3"]) {
        if (desc.get(PDFName.of(k)) !== undefined) return true;
      }
    }
    // Type0 — skutečné písmo je v potomkovi
    const desc0 = resolve(fontDict.get(PDFName.of("DescendantFonts")));
    if (desc0 instanceof PDFArray) {
      for (let i = 0; i < desc0.size(); i++) {
        const child = resolve(desc0.get(i));
        if (child instanceof PDFDict && maFontFile(child)) return true;
      }
    }
    return false;
  };

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const typ = obj.get(PDFName.of("Type"));
    if (!(typ instanceof PDFName) || typ.asString() !== "/Font") continue;

    const subtype = obj.get(PDFName.of("Subtype"));
    // CIDFontType0/2 se počítají přes rodičovský Type0, ať nedvojíme
    if (
      subtype instanceof PDFName &&
      subtype.asString().startsWith("/CIDFont")
    ) {
      continue;
    }

    celkem++;
    if (!maFontFile(obj)) {
      const base = obj.get(PDFName.of("BaseFont"));
      nevlozene.add(
        base instanceof PDFName ? base.asString().replace(/^\//, "") : "neznámé",
      );
    }
  }

  return { nevlozene: [...nevlozene], celkem };
}

export async function rozeber(
  soubor: File | { name: string; bytes: Uint8Array },
): Promise<Rozbor> {
  const nazevSouboru = soubor instanceof File ? soubor.name : soubor.name;
  const bytes =
    soubor instanceof File
      ? new Uint8Array(await soubor.arrayBuffer())
      : soubor.bytes;

  const zaklad: Rozbor = {
    nazevSouboru,
    velikost: bytes.length,
    verzePdf: null,
    pocetStran: 0,
    strankyMm: [],
    pdfaPart: null,
    pdfaConformance: null,
    maOutputIntent: false,
    maXmp: false,
    sifrovano: false,
    podepsano: false,
    maJavaScript: false,
    maVrstvyOcg: false,
    nevlozeneFonty: [],
    pocetFontu: 0,
    producer: null,
    creator: null,
    nalezy: [],
  };

  // Verzi PDF čteme z hlavičky, pdf-lib ji nezpřístupňuje. Katalogový
  // /Version, pokud existuje, má přednost — Archicad zapisuje obojí různě.
  const hlavicka = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  zaklad.verzePdf = hlavicka.match(/%PDF-(\d\.\d)/)?.[1] ?? null;

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
  } catch (e) {
    return {
      ...zaklad,
      chybaCteni: e instanceof Error ? e.message : String(e),
      nalezy: [
        {
          klic: "cteni",
          popis: "Soubor se nepodařilo přečíst — je poškozený nebo to není PDF.",
          stav: "chyba",
        },
      ],
    };
  }

  zaklad.sifrovano = doc.isEncrypted;
  zaklad.pocetStran = doc.getPageCount();
  zaklad.strankyMm = doc.getPages().map((p) => {
    const { width, height } = p.getSize();
    return {
      sirka: Math.round(width * BODY_NA_MM),
      vyska: Math.round(height * BODY_NA_MM),
      rotace: p.getRotation().angle,
    };
  });
  zaklad.producer = doc.getProducer() ?? null;
  zaklad.creator = doc.getCreator() ?? null;

  const katalog = doc.catalog;
  const verzeKatalog = katalog.get(PDFName.of("Version"));
  if (verzeKatalog instanceof PDFName) {
    zaklad.verzePdf = verzeKatalog.asString().replace(/^\//, "");
  }
  zaklad.maOutputIntent = katalog.get(PDFName.of("OutputIntents")) !== undefined;
  zaklad.maVrstvyOcg = katalog.get(PDFName.of("OCProperties")) !== undefined;

  // XMP metadata → pdfaid
  const metaRef = katalog.get(PDFName.of("Metadata"));
  const meta =
    metaRef instanceof PDFRef ? doc.context.lookup(metaRef) : metaRef;
  if (meta instanceof PDFStream) {
    const xmp = textZeStreamu(meta);
    zaklad.maXmp = xmp.length > 0;
    zaklad.pdfaPart = xmp.match(/pdfaid[:\s]*part[^0-9]*(\d)/i)?.[1] ?? null;
    zaklad.pdfaConformance =
      xmp.match(/pdfaid[:\s]*conformance[^A-Za-z]*([ABU])/i)?.[1] ?? null;
  }

  // Elektronický podpis — pole typu /Sig v AcroFormu
  const acroRef = katalog.get(PDFName.of("AcroForm"));
  const acro = acroRef instanceof PDFRef ? doc.context.lookup(acroRef) : acroRef;
  if (acro instanceof PDFDict) {
    if (acro.get(PDFName.of("SigFlags")) !== undefined) zaklad.podepsano = true;
    const fields = acro.get(PDFName.of("Fields"));
    const arr = fields instanceof PDFRef ? doc.context.lookup(fields) : fields;
    if (arr instanceof PDFArray) {
      for (let i = 0; i < arr.size(); i++) {
        const f = doc.context.lookupMaybe(arr.get(i), PDFDict);
        const ft = f?.get(PDFName.of("FT"));
        if (ft instanceof PDFName && ft.asString() === "/Sig") {
          zaklad.podepsano = true;
        }
      }
    }
  }

  // JavaScript / spustitelný kód — příloha č. 3 vyhl. 190/2024 Sb. je zakazuje
  const names = doc.context.lookupMaybe(
    katalog.get(PDFName.of("Names")),
    PDFDict,
  );
  zaklad.maJavaScript =
    names?.get(PDFName.of("JavaScript")) !== undefined ||
    katalog.get(PDFName.of("AA")) !== undefined;

  const { nevlozene, celkem } = fontyBezVlozeni(doc);
  zaklad.nevlozeneFonty = nevlozene;
  zaklad.pocetFontu = celkem;

  zaklad.nalezy = vyhodnot(zaklad);
  return zaklad;
}

/** Převede surová zjištění na srozumitelný checklist. */
function vyhodnot(r: Rozbor): Nalez[] {
  const n: Nalez[] = [];

  const jePdfa3 = r.pdfaPart === "3" && r.maOutputIntent;
  n.push({
    klic: "pdfa",
    popis: jePdfa3
      ? `Je PDF/A-3${r.pdfaConformance ?? ""} — portál tento formát přijímá`
      : "Není PDF/A-3 — portál soubor odmítne",
    stav: jePdfa3 ? "ok" : "chyba",
    detail: jePdfa3
      ? undefined
      : "Vyhláška č. 190/2024 Sb., příloha č. 4 požaduje pro výkresy i ostatní dokumenty PDF/A-3.",
  });

  if (r.pdfaPart && !r.maOutputIntent) {
    n.push({
      klic: "falesne-pdfa",
      popis: "Soubor se za PDF/A vydává, ale platné PDF/A není",
      stav: "chyba",
      detail:
        `V XMP metadatech je uvedeno pdfaid:part=${r.pdfaPart}, ale chybí OutputIntent s ICC profilem. ` +
        "Takový soubor validátor odmítne. Typicky vzniká špatně nastaveným Ghostscriptem.",
    });
  }

  n.push({
    klic: "outputintent",
    popis: r.maOutputIntent
      ? "OutputIntent (ICC profil) je vložen"
      : "Chybí OutputIntent s ICC profilem",
    stav: r.maOutputIntent ? "ok" : "chyba",
  });

  n.push({
    klic: "fonty",
    popis:
      r.nevlozeneFonty.length === 0
        ? `Všechna písma jsou vložena (${r.pocetFontu})`
        : `${r.nevlozeneFonty.length} písem není vloženo`,
    stav: r.nevlozeneFonty.length === 0 ? "ok" : "varovani",
    detail:
      r.nevlozeneFonty.length > 0
        ? `Nevložená: ${r.nevlozeneFonty.join(", ")}. Při převodu je Ghostscript nahradí náhradním písmem — text se může posunout. Zkontroluj výsledek.`
        : undefined,
  });

  n.push({
    klic: "sifrovani",
    popis: r.sifrovano
      ? "Soubor je zašifrovaný / chráněný heslem"
      : "Bez šifrování",
    stav: r.sifrovano ? "chyba" : "ok",
    detail: r.sifrovano
      ? "PDF/A šifrování nepřipouští. Ochranu je nutné odstranit před převodem."
      : undefined,
  });

  n.push({
    klic: "javascript",
    popis: r.maJavaScript
      ? "Soubor obsahuje JavaScript nebo automatické akce"
      : "Bez maker a skriptů",
    stav: r.maJavaScript ? "chyba" : "ok",
    detail: r.maJavaScript
      ? "Příloha č. 3 vyhlášky č. 190/2024 Sb.: dokumenty nesmí obsahovat makra, skripty a jiné spustitelné kódy."
      : undefined,
  });

  if (r.podepsano) {
    n.push({
      klic: "podpis",
      popis: "Soubor je elektronicky podepsaný — neupravuj ho",
      stav: "varovani",
      detail:
        "Jakákoli úprava podpis zneplatní. Správné pořadí je: úpravy → převod na PDF/A-3 → teprve pak autorizační razítko.",
    });
  }

  if (r.maVrstvyOcg) {
    n.push({
      klic: "ocg",
      popis: "Soubor obsahuje vrstvy (OCG)",
      stav: "info",
      detail:
        "V PDF/A-3 jsou vrstvy povolené a převod je zachová. V PDF/A-1 povolené nejsou.",
    });
  }

  return n;
}
