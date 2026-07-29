/// <reference lib="webworker" />
/**
 * Web Worker s Ghostscriptem (WASM). Běží mimo hlavní vlákno, takže se UI
 * při převodu velkých výkresů nezasekne.
 *
 * Načítá `/gs.js` + `/gs.wasm` z public/ — soubory tam kopíruje `npm run sync-wasm`.
 */

export interface GsRequest {
  id: number;
  /** Vstupní PDF. */
  data: Uint8Array;
  /** Argumenty Ghostscriptu bez -sOutputFile a bez vstupního souboru. */
  args: string[];
  /** Obsah PDFA_def.ps; když chybí, OutputIntent se nevkládá. */
  pdfaDef?: string;
}

export type GsResponse =
  | { id: number; ok: true; data: Uint8Array; log: string[]; ms: number }
  | { id: number; ok: false; error: string; log: string[] };

type GsModule = {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array | string): void;
    readFile(path: string, opts: { encoding: "binary" }): Uint8Array;
    unlink(path: string): void;
  };
};

declare const self: DedicatedWorkerGlobalScope & {
  Module?: unknown;
};

let factory: ((opts: Record<string, unknown>) => Promise<GsModule>) | null =
  null;

async function getFactory() {
  if (factory) return factory;
  // gs.js je emscriptenový ES modul v public/. Načítáme ho až při prvním
  // použití, aby se 15MB wasm nestahoval hned při otevření stránky.
  // Specifikátor držíme v proměnné: je to runtime URL, ne modul v bundlu,
  // takže ho nesmí řešit ani TypeScript, ani webpack.
  const url = "/gs.js";
  const mod: { default?: unknown } = await import(
    /* webpackIgnore: true */ url
  );
  factory = (mod.default ?? mod) as (
    opts: Record<string, unknown>,
  ) => Promise<GsModule>;
  if (!factory) throw new Error("Nepodařilo se načíst Ghostscript (gs.js).");
  return factory;
}

self.onmessage = async (e: MessageEvent<GsRequest>) => {
  const { id, data, args, pdfaDef } = e.data;
  const log: string[] = [];
  const t0 = performance.now();

  try {
    const load = await getFactory();
    // Instanci vytváříme pro každý běh znovu — Ghostscript po callMain()
    // není spolehlivě znovupoužitelný a sdílený FS by mezi soubory prosakoval.
    const Module = await load({
      noInitialRun: true,
      locateFile: (p: string) => (p.endsWith(".wasm") ? "/gs.wasm" : p),
      print: (s: string) => log.push(s),
      printErr: (s: string) => log.push(s),
    });

    Module.FS.writeFile("in.pdf", data);
    const vstupy: string[] = [];
    if (pdfaDef) {
      Module.FS.writeFile("PDFA_def.ps", pdfaDef);
      vstupy.push("PDFA_def.ps");
    }
    vstupy.push("in.pdf");

    const rc = Module.callMain([...args, "-sOutputFile=out.pdf", ...vstupy]);

    // Existenci výstupu ověříme pokusem o čtení — tento build emscriptenu
    // nemá FS.analyzePath.
    let out: Uint8Array;
    try {
      out = Module.FS.readFile("out.pdf", { encoding: "binary" });
    } catch {
      throw new Error(
        `Ghostscript nevytvořil výstup (kód ${rc}). ${log.slice(-4).join(" ")}`.trim(),
      );
    }

    if (rc !== 0 || out.length === 0) {
      throw new Error(
        `Ghostscript skončil s kódem ${rc}. ${log.slice(-4).join(" ")}`.trim(),
      );
    }
    // Kopie do samostatného bufferu — pohled do heapu WASM nelze přenést.
    const copy = new Uint8Array(out.length);
    copy.set(out);

    const res: GsResponse = {
      id,
      ok: true,
      data: copy,
      log,
      ms: Math.round(performance.now() - t0),
    };
    self.postMessage(res, [copy.buffer]);
  } catch (err) {
    const res: GsResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      log,
    };
    self.postMessage(res);
  }
};
