import type { GsRequest, GsResponse } from "@/workers/gs.worker";
import { pdfaDefPs } from "./pdfaDef";
import type { Profil } from "./profiles";

export interface VysledekPrevodu {
  data: Uint8Array;
  ms: number;
  log: string[];
}

let worker: Worker | null = null;
let dalsiId = 1;
const cekajici = new Map<
  number,
  { resolve: (v: VysledekPrevodu) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../../workers/gs.worker.ts", import.meta.url));
  worker.onmessage = (e: MessageEvent<GsResponse>) => {
    const p = cekajici.get(e.data.id);
    if (!p) return;
    cekajici.delete(e.data.id);
    if (e.data.ok) {
      p.resolve({ data: e.data.data, ms: e.data.ms, log: e.data.log });
    } else {
      p.reject(new Error(e.data.error));
    }
  };
  worker.onerror = (e) => {
    for (const p of cekajici.values()) {
      p.reject(new Error(e.message || "Chyba ve worker vlákně Ghostscriptu."));
    }
    cekajici.clear();
    // Poškozený worker zahodíme, ať se příště vytvoří čistý.
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Převede PDF podle zvoleného profilu. Běží celé v prohlížeči. */
export function prevest(
  data: Uint8Array,
  profil: Profil,
): Promise<VysledekPrevodu> {
  const id = dalsiId++;
  const req: GsRequest = {
    id,
    data,
    args: profil.gsArgs,
    // OutputIntent má smysl jen u PDF/A profilů.
    pdfaDef: profil.pdfaPart ? pdfaDefPs() : undefined,
  };
  return new Promise<VysledekPrevodu>((resolve, reject) => {
    cekajici.set(id, { resolve, reject });
    // data posíláme kopií — volající si originál obvykle chce nechat
    getWorker().postMessage(req);
  });
}

/** Předehřeje worker, aby první převod nečekal na stažení 15 MB wasm. */
export function predehrat(): void {
  getWorker();
}
