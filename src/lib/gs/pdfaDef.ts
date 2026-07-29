/**
 * Generátor PDFA_def.ps — PostScript, který Ghostscriptu řekne, aby do výstupu
 * vložil OutputIntent s ICC profilem.
 *
 * Bez tohoto souboru Ghostscript OutputIntent nevloží a výsledek NENÍ platné
 * PDF/A, i když bude mít v XMP metadatech napsáno `pdfaid:part`.
 *
 * ICC profil bereme z ROM filesystému Ghostscriptu (`%rom%iccprofiles/srgb.icc`),
 * takže se nemusí distribuovat žádný externí soubor ani řešit jeho licenci.
 */
export function pdfaDefPs(): string {
  return `%!
% --- OutputIntent pro PDF/A ---
[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA} <</N 3>> /PUT pdfmark
[{icc_PDFA} (%rom%iccprofiles/srgb.icc) (r) file /PUT pdfmark
[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {icc_PDFA}
  /OutputConditionIdentifier (sRGB IEC61966-2.1)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFA} ]>> /PUT pdfmark
`;
}
