"use client";

import { Karta, Napoveda } from "./Ui";
import {
  FORMATY_PAPIRU,
  type FormatPapiru,
  type Orientace,
  type RezimUmisteni,
  type Stranka,
} from "@/lib/pdf/compose";

interface Props {
  stranky: Stranka[];
  onZmena: (s: Stranka[]) => void;
}

const REZIMY: { id: RezimUmisteni; nazev: string; popis: string }[] = [
  {
    id: "zachovat",
    nazev: "Zachovat měřítko",
    popis:
      "Kresba si podrží velikost, jen se vycentruje na nový list. Kóty a měřítko výkresu zůstanou platné.",
  },
  {
    id: "vejit",
    nazev: "Vejít se na list",
    popis:
      "Zmenší nebo zvětší tak, aby se celá stránka vešla. Měřítko výkresu se tím změní.",
  },
  {
    id: "vyplnit",
    nazev: "Vyplnit list",
    popis: "Vyplní celý list, přesah se ořízne. Měřítko výkresu se změní.",
  },
];

export function KrokFormat({ stranky, onZmena }: Props) {
  const spolecny = stranky[0]?.format;

  function nastavitVsem(zmena: Partial<NonNullable<Stranka["format"]>>) {
    onZmena(
      stranky.map((s) => ({
        ...s,
        format: {
          format: zmena.format ?? s.format?.format ?? "A4",
          orientace: zmena.orientace ?? s.format?.orientace ?? "vyska",
          rezim: zmena.rezim ?? s.format?.rezim ?? "zachovat",
        },
      })),
    );
  }

  function ponechat() {
    onZmena(stranky.map((s) => ({ ...s, format: undefined })));
  }

  return (
    <div className="space-y-5">
      <Karta>
        <p className="text-sm font-semibold">Formát listu</p>
        <Napoveda>
          Nechceš-li s rozměry hýbat, ponech původní. Pro podání to není
          potřeba — portál konkrétní formát papíru nepředepisuje.
        </Napoveda>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={ponechat}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: !spolecny ? "var(--modra)" : "var(--linka)",
              background: !spolecny ? "var(--modra-svetla)" : "transparent",
            }}
          >
            Ponechat původní
          </button>
          {(Object.keys(FORMATY_PAPIRU) as FormatPapiru[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => nastavitVsem({ format: f })}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor:
                  spolecny?.format === f ? "var(--modra)" : "var(--linka)",
                background:
                  spolecny?.format === f ? "var(--modra-svetla)" : "transparent",
              }}
            >
              {f}
              <span className="ml-1 text-xs" style={{ color: "var(--tlumeny)" }}>
                {FORMATY_PAPIRU[f][0]}×{FORMATY_PAPIRU[f][1]}
              </span>
            </button>
          ))}
        </div>

        {spolecny && (
          <>
            <div className="mt-4 flex gap-2">
              {(["vyska", "sirka"] as Orientace[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => nastavitVsem({ orientace: o })}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor:
                      spolecny.orientace === o ? "var(--modra)" : "var(--linka)",
                    background:
                      spolecny.orientace === o
                        ? "var(--modra-svetla)"
                        : "transparent",
                  }}
                >
                  {o === "vyska" ? "Na výšku" : "Na šířku"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {REZIMY.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => nastavitVsem({ rezim: r.id })}
                  className="block w-full rounded-md border p-3 text-left"
                  style={{
                    borderColor:
                      spolecny.rezim === r.id ? "var(--modra)" : "var(--linka)",
                    background:
                      spolecny.rezim === r.id
                        ? "var(--modra-svetla)"
                        : "transparent",
                  }}
                >
                  <p className="text-sm font-medium">{r.nazev}</p>
                  <p
                    className="mt-0.5 text-xs leading-relaxed"
                    style={{ color: "var(--tlumeny)" }}
                  >
                    {r.popis}
                  </p>
                </button>
              ))}
            </div>

            {spolecny.rezim !== "zachovat" && (
              <p
                className="mt-4 rounded-md border p-3 text-xs leading-relaxed"
                style={{
                  borderColor: "var(--oranzova)",
                  color: "var(--oranzova)",
                }}
              >
                Pozor: tento režim mění velikost kresby, a tím i měřítko
                výkresu. Kóty v rohovém razítku pak nebudou odpovídat. U výkresů
                určených k podání použij &bdquo;Zachovat měřítko&ldquo;.
              </p>
            )}
          </>
        )}
      </Karta>
    </div>
  );
}
