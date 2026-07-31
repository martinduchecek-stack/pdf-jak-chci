import type { Metadata } from "next";
import Link from "next/link";
import { DAR, ZDROJOVY_KOD } from "@/lib/odkazy";

export const metadata: Metadata = {
  title: "Podmínky použití — Pdf jak chci",
  description:
    "Aplikace je poskytována zdarma a bez záruky. Omezení odpovědnosti, zpracování dat a použitý software.",
};

const AKTUALIZACE = "30. 7. 2026";

export default function Podminky() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      <Link
        href="/"
        className="text-sm hover:underline"
        style={{ color: "var(--modra)" }}
      >
        ← Zpět do aplikace
      </Link>

      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        Podmínky použití
      </h1>
      <p className="mt-1 text-xs" style={{ color: "var(--tlumeny)" }}>
        Poslední aktualizace: {AKTUALIZACE}
      </p>

      <div className="mt-8 space-y-8">
        <Sekce cislo="1" nazev="Co tato aplikace je">
          <p>
            <strong>Pdf jak chci</strong> je bezplatný nástroj pro převod PDF do
            formátu PDF/A-3, pro skládání a úpravy dokumentace a pro kontrolu
            souborů před podáním na Portál stavebníka.
          </p>
          <p>
            Vznikla pro vlastní potřebu autora a je zveřejněná tak, jak je.
            Použít ji může kdokoli, zdarma a bez registrace. Není to komerční
            produkt a autor k ní neposkytuje podporu ani neslibuje, že ji bude
            dál rozvíjet nebo že zůstane dostupná.
          </p>
        </Sekce>

        <Sekce cislo="2" nazev="Bez záruky">
          <p>
            Aplikace je poskytována <strong>„jak stojí a leží“</strong>, bez
            jakékoli záruky, výslovné ani mlčky předpokládané. Autor zejména
            nezaručuje, že:
          </p>
          <ul>
            <li>aplikace bude fungovat bez chyb a přerušení,</li>
            <li>
              výstupní soubor bude bez vad nebo že bude odpovídat normě ISO
              19005 (PDF/A),
            </li>
            <li>
              výstup přijme Portál stavebníka, stavební úřad, dotčený orgán ani
              jiný adresát,
            </li>
            <li>
              převod zachová vzhled, obsah, měřítko, vrstvy nebo jakoukoli jinou
              vlastnost původního dokumentu.
            </li>
          </ul>
        </Sekce>

        <Sekce cislo="3" nazev="Kontrola výsledku je na uživateli">
          <p>
            Kontrola zabudovaná v aplikaci pokrývá nejčastější příčiny odmítnutí
            (chybějící OutputIntent, nevložená písma, šifrování, spustitelný
            kód), ale <strong>není plnou validací podle ISO 19005</strong>.
            Definitivní verdikt dá validátor jako veraPDF nebo samotný portál.
          </p>
          <p>
            Převod je při vývoji ověřován právě validátorem veraPDF, ale to
            neznamená záruku, že normě vyhoví každý možný vstupní soubor.
            U dokumentů, na kterých závisí lhůta, se vyplatí výstup ověřit.
          </p>
          <p>
            Uživatel je povinen si každý výstup před podáním otevřít a
            zkontrolovat — zejména čitelnost, úplnost, rozměry listu a měřítko.
            U výkresů platí, že ořez a změna formátu papíru mohou měřítko změnit;
            aplikace na to upozorňuje, ale ověření je na uživateli.
          </p>
          <p>
            Odpovědnost za obsah a správnost projektové dokumentace nese její
            zpracovatel. Autorizace a opatření dokumentace elektronickým
            autorizačním razítkem podle § 13 odst. 3 písm. b) zákona
            č. 360/1992 Sb. zůstávají plně na autorizované osobě — aplikace
            žádnou část této odpovědnosti nepřejímá a autorizaci neprovádí.
          </p>
        </Sekce>

        <Sekce cislo="4" nazev="Omezení odpovědnosti">
          <p>
            V rozsahu, v jakém to právní předpisy dovolují, autor neodpovídá za
            žádnou škodu ani jinou újmu vzniklou v souvislosti s použitím
            aplikace nebo s nemožností ji použít. To se týká zejména škody
            způsobené vadným, poškozeným nebo ztraceným souborem, odmítnutím
            podání, zmeškáním lhůty, přerušením nebo zdržením řízení, ztrátou
            dat či ušlým ziskem.
          </p>
          <p>
            Uživatel si je vědom, že aplikace pracuje s dokumenty, na kterých
            mohou záviset úřední postupy a lhůty, a používá ji na vlastní
            odpovědnost. Doporučuje se ponechat si originály souborů.
          </p>
          <p>
            <strong>Toto omezení má zákonné hranice.</strong> Nevztahuje se na
            škodu způsobenou úmyslně nebo z hrubé nedbalosti ani na újmu na
            přirozených právech člověka — takové odpovědnosti se podle § 2898
            zákona č. 89/2012 Sb., občanského zákoníku, vzdát nelze.
          </p>
        </Sekce>

        <Sekce cislo="5" nazev="Soubory a zpracování dat">
          <p>
            Aplikace nemá žádný server pro zpracování dokumentů.{" "}
            <strong>
              Všechno se počítá přímo v prohlížeči uživatele a žádný nahraný
              soubor se nikam neodesílá.
            </strong>{" "}
            Autor k dokumentům nemá a nemůže mít přístup, nevznikají o nich
            žádné záznamy a po zavření karty prohlížeče se z paměti ztratí.
          </p>
          <p>
            Aplikace sama neukládá cookies, nepoužívá analytické nástroje ani
            nesleduje chování uživatelů. Hosting (Vercel Inc.) vede standardní
            provozní záznamy o přístupech na server, jako každá webová stránka;
            obsah zpracovávaných dokumentů v nich není.
          </p>
        </Sekce>

        <Sekce cislo="6" nazev="Licence a zdrojový kód">
          <p>
            Copyright ©&nbsp;2026 Martin Ducheček. Aplikace je svobodný software
            šířený pod licencí <strong>GNU Affero General Public License
            v3</strong> nebo pozdější. Smíš ji používat, upravovat i dál šířit
            za podmínek této licence.
          </p>
          <p>
            <a
              href={ZDROJOVY_KOD}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--modra)" }}
            >
              Zdrojový kód aplikace na GitHubu
            </a>{" "}
            — zveřejněný mimo jiné proto, že to AGPL v čl. 13 u programů
            provozovaných po síti vyžaduje.
          </p>
          <p>Aplikace stojí na těchto komponentách:</p>
          <ul>
            <li>
              <strong>Ghostscript / GhostPDL</strong>{" "}
              — převod do PDF/A, AGPL-3.0-or-later, ©&nbsp;Artifex Software,
              Inc.{" "}
              <a
                href="https://github.com/okathira/ghostpdl-wasm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--modra)" }}
              >
                zdrojový kód použitého WASM buildu
              </a>
            </li>
            <li>
              <strong>pdf-lib</strong> (MIT), <strong>pdf.js</strong>{" "}
              (Apache-2.0), <strong>JSZip</strong> (MIT),{" "}
              <strong>dnd-kit</strong> (MIT), <strong>Next.js</strong> a{" "}
              <strong>React</strong> (MIT)
            </li>
          </ul>
        </Sekce>

        <Sekce cislo="7" nazev="Dobrovolný příspěvek" id="dar">
          <p>
            Aplikace je a zůstane zdarma. Není za ni požadována žádná platba,
            není nijak omezená a nemá placenou verzi. Pokud ti pomohla a chceš
            autora podpořit, můžeš poslat dobrovolný příspěvek — ale nic tě
            k tomu nenutí a nepřijdeš tím k ničemu navíc.
          </p>

          <div
            className="mt-4 flex flex-col gap-5 rounded-lg border p-4 sm:flex-row sm:items-center"
            style={{ borderColor: "var(--linka)" }}
          >
            <div className="shrink-0 self-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DAR.qr}
                alt={`QR platba na účet ${DAR.ucet}`}
                width={150}
                height={150}
                className="rounded bg-white p-2"
              />
              <p className="mt-1 text-center text-[11px]">QR platba</p>
            </div>
            <div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="font-medium" style={{ color: "var(--text)" }}>
                  Účet
                </dt>
                <dd>
                  <strong style={{ color: "var(--text)" }}>{DAR.ucet}</strong>
                </dd>
                <dt className="font-medium" style={{ color: "var(--text)" }}>
                  IBAN
                </dt>
                <dd>{DAR.iban}</dd>
                <dt className="font-medium" style={{ color: "var(--text)" }}>
                  Částka
                </dt>
                <dd>libovolná, podle vlastního uvážení</dd>
              </dl>
              <p className="mt-3 text-[11px]">Příjemce: {DAR.prijemce}</p>
            </div>
          </div>

          <p className="mt-4">Právní povaha příspěvku:</p>
          <ul>
            <li>
              Jde o <strong>dar podle § 2055 a násl. občanského zákoníku</strong>,
              tedy bezúplatné plnění. <strong>Není protiplněním</strong> za
              aplikaci ani za jakoukoli službu.
            </li>
            <li>
              <strong>Nezakládá žádný nárok</strong> — ani na podporu, opravu
              chyby, novou funkci, dostupnost aplikace či přednostní jednání.
            </li>
            <li>
              <strong>Nemění nic na vyloučení záruky</strong> podle článků 2
              až 4 těchto podmínek.
            </li>
            <li>
              Je <strong>nevratný</strong>. Dar lze podle § 2072 obč. zák.
              odvolat jen ze zákonných důvodů (nouze dárce, nevděk obdarovaného).
            </li>
            <li>
              {/* Mezeru je nutné zapsat výslovně — kompilátor ji z textu
                  obsahujícího entitu &nbsp; jinak odstraní. */}
              <strong>Nejde o veřejnou sbírku</strong>{" "}
              podle zákona č.&nbsp;117/2001 Sb. — tu mohou pořádat pouze
              právnické osoby.
              Příspěvek je darem konkrétní fyzické osobě uvedené výše.
            </li>
            <li>
              <strong>Není odčitatelnou položkou</strong> od základu daně.
              Odpočet podle § 15 odst. 1, resp. § 20 odst. 8 zákona o daních
              z příjmů se vztahuje jen na dary na zákonem vyjmenované účely
              a příjemce, což tento případ nesplňuje.
            </li>
            <li>
              O dárci se nesbírají žádné údaje nad rámec toho, co je uvedeno
              v bankovním převodu. Do zprávy pro příjemce prosím neuváděj
              osobní ani citlivé údaje.
            </li>
          </ul>
        </Sekce>

        <Sekce cislo="8" nazev="Změny podmínek">
          <p>
            Tyto podmínky může autor kdykoli změnit. Rozhodné je znění zveřejněné
            na této adrese v okamžiku použití aplikace.
          </p>
        </Sekce>
      </div>

      <p
        className="mt-10 border-t pt-5 text-xs leading-relaxed"
        style={{ borderColor: "var(--linka)", color: "var(--tlumeny)" }}
      >
        Odkazy na právní předpisy jsou uvedeny pro orientaci a nejsou právní
        radou.
      </p>
    </main>
  );
}

function Sekce({
  cislo,
  nazev,
  id,
  children,
}: {
  cislo: string;
  nazev: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-semibold">
        {cislo}. {nazev}
      </h2>
      <div
        className="mt-2 space-y-3 text-sm leading-relaxed [&_a]:underline [&_li]:mt-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        style={{ color: "var(--tlumeny)" }}
      >
        {children}
      </div>
    </section>
  );
}
