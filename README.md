# Pdf jak chci

Webová aplikace pro převod PDF do **PDF/A-3** požadovaného Portálem stavebníka,
pro skládání dokumentace z více zdrojů a pro kontrolu souboru před podáním.

Všechno se počítá v prohlížeči — **žádný soubor se nikam nenahrává**. Projektová
dokumentace klientů tak neopustí počítač uživatele.

## Co aplikace řeší

Archicad (přes PDFTron PDFNet) exportuje obyčejné PDF 1.4 bez XMP metadat
a bez OutputIntent. Takový soubor **není PDF/A** a portál ho odmítne.

Častá past: Ghostscript spuštěný s `-sColorConversionStrategy=UseDeviceIndependentColor`
PDF/A režim tiše zahodí („reverting to normal output"), ale XMP metadata
s `pdfaid:part` ve výstupu nechá. Vznikne soubor, který se za PDF/A vydává,
ale OutputIntent nemá — validátor ho odmítne. Správně musí být
`-sColorConversionStrategy=RGB` **a** `PDFA_def.ps` vkládající OutputIntent.

## Právní opora

| Součást | Formát | Zdroj |
|---|---|---|
| Výkresy, ostatní dokumenty | PDF/A-3 | vyhl. č. 190/2024 Sb., příl. č. 4 |
| Průvodní list (strojově čitelný) | XML | tamtéž |
| Elektronická dokumentace jako celek | BPP | tamtéž |
| Zákaz maker, skriptů, spustitelného kódu | — | vyhl. č. 190/2024 Sb., příl. č. 3 |

Limity portálu (Uživatelská dokumentace Portálu stavební správy v1.13):

- příloha žádosti: **pouze PDF/A**, max. 100 MB / soubor, 1 GB / žádost
- dokumentace: 10 GB celkem, max. 50 000 souborů, limit na jeden soubor není
- struktura A–E je pevná a nahrává se **vždy celá**

## Co aplikace neřeší

- **Autorizační razítko.** Elektronickou PD je nutné opatřit kvalifikovaným
  podpisem s kvalifikovaným časovým razítkem (§ 13 odst. 3 písm. b
  autorizačního zákona). Dělá se to až po převodu, jinak by úprava podpis
  zneplatnila.
- **Plnou validaci podle ISO 19005.** Kontrola pokrývá nejčastější příčiny
  odmítnutí (chybějící OutputIntent, nevložená písma, šifrování, JavaScript),
  ale definitivní verdikt dá veraPDF nebo samotný portál.
- **Konverzi CAD formátů.** DWG/DGN se do prohlížeče nedostane — z Archicadu
  se tiskne do PDF a teprve to jde sem.

## Technické poznámky

- **Ghostscript ve WASM** (`@okathira/ghostpdl-wasm`, ~15 MB) běží ve Web
  Workeru, aby se UI nezaseklo. Načítá se až při prvním převodu.
- **ICC profil** se bere z ROM filesystému Ghostscriptu
  (`%rom%iccprofiles/srgb.icc`), takže se nedistribuuje žádný externí soubor.
- **Ghostscript umí jen konformitu úrovně B** (PDF/A-1b/2b/3b). Úroveň „u"
  ani „a" přes `pdfwrite` dosáhnout nelze, proto je aplikace nenabízí.
- **Přeskládání stránek jde přes pdf-lib**, které nepřenáší `/OCProperties` —
  vrstvy výkresu se tím ztratí. Když se s jediným souborem nic nemění,
  aplikace pdf-lib obejde a pošle Ghostscriptu původní bajty.

## Vývoj

```bash
npm install
npm run dev
```

`npm install` spustí `sync-wasm`, který zkopíruje `gs.wasm` a `gs.js`
z `node_modules` do `public/`.

```bash
npm run build
```
