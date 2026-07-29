"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjs: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (pdfjs) return pdfjs;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  pdfjs = lib;
  return lib;
}

const cacheDokumentu = new Map<string, Promise<PDFDocumentProxy>>();

export async function otevrit(
  id: string,
  bytes: Uint8Array,
): Promise<PDFDocumentProxy> {
  const hotove = cacheDokumentu.get(id);
  if (hotove) return hotove;

  const p = (async () => {
    const lib = await getPdfjs();
    // pdf.js si buffer přivlastní, proto posíláme kopii
    return lib.getDocument({ data: new Uint8Array(bytes) }).promise;
  })();

  // Neúspěch nesmí zůstat v cache — jinak by se náhled už nikdy nepodařilo
  // vykreslit ani po opakovaném pokusu.
  p.catch(() => cacheDokumentu.delete(id));

  cacheDokumentu.set(id, p);
  return p;
}

export function zapomenout(id: string) {
  cacheDokumentu
    .get(id)
    ?.then((d) => d.cleanup())
    .catch(() => {});
  cacheDokumentu.delete(id);
}

/** Vykreslí stránku do dataURL o zadané šířce v pixelech. */
export async function nahled(
  doc: PDFDocumentProxy,
  cisloStranky: number,
  sirkaPx = 200,
): Promise<string> {
  const page = await doc.getPage(cisloStranky);
  const zaklad = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: sirkaPx / zaklad.width });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Prohlížeč neposkytl 2D kontext plátna.");

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}
