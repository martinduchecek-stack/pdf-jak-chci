"use client";

import { useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Napoveda } from "./Ui";
import { OrezEditor } from "./OrezEditor";
import type { Stranka, Zdroj } from "@/lib/pdf/compose";
import type { Rozbor } from "@/lib/pdf/inspect";
import { nahled, otevrit } from "@/lib/pdf/render";

interface Props {
  zdroje: Zdroj[];
  stranky: Stranka[];
  rozbory: Record<string, Rozbor>;
  onZmena: (s: Stranka[]) => void;
}

export function KrokStranky({ zdroje, stranky, rozbory, onZmena }: Props) {
  const [nahledy, setNahledy] = useState<Record<string, string>>({});
  const [orezId, setOrezId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    let zruseno = false;
    (async () => {
      for (const s of stranky) {
        if (nahledy[s.id]) continue;
        const z = zdroje.find((x) => x.id === s.zdrojId);
        if (!z) continue;
        try {
          if (z.typ === "obrazek") {
            const blob = new Blob([z.bytes.slice()]);
            const url = URL.createObjectURL(blob);
            if (!zruseno) setNahledy((p) => ({ ...p, [s.id]: url }));
            continue;
          }
          const doc = await otevrit(z.id, z.bytes);
          const url = await nahled(doc, s.indexVeZdroji + 1, 220);
          if (!zruseno) setNahledy((p) => ({ ...p, [s.id]: url }));
        } catch (e) {
          // Náhled je jen pomůcka — chyba nesmí shodit průvodce, ale chceme
          // o ní vědět, když se ladí.
          console.warn("Náhled stránky selhal:", e);
        }
      }
    })();
    return () => {
      zruseno = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stranky, zdroje]);

  function presunout(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const stary = stranky.findIndex((s) => s.id === active.id);
    const novy = stranky.findIndex((s) => s.id === over.id);
    onZmena(arrayMove(stranky, stary, novy));
  }

  function otocit(id: string) {
    onZmena(
      stranky.map((s) =>
        s.id === id ? { ...s, rotace: (s.rotace + 90) % 360 } : s,
      ),
    );
  }

  function smazat(id: string) {
    onZmena(stranky.filter((s) => s.id !== id));
  }

  function nastavitOrez(id: string, orez: Stranka["orez"]) {
    onZmena(stranky.map((s) => (s.id === id ? { ...s, orez } : s)));
  }

  const orezStranka = stranky.find((s) => s.id === orezId);
  const orezZdroj = orezStranka
    ? zdroje.find((z) => z.id === orezStranka.zdrojId)
    : undefined;
  const orezRozmer = orezStranka
    ? rozbory[orezStranka.zdrojId]?.strankyMm[orezStranka.indexVeZdroji]
    : undefined;

  if (!stranky.length) {
    return <Napoveda>Zatím nemáš nahrané žádné stránky.</Napoveda>;
  }

  return (
    <div>
      <Napoveda>
        Stránky přetáhni myší do požadovaného pořadí. Číslo v rohu je pořadí ve
        výsledném dokumentu.
      </Napoveda>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={presunout}
      >
        <SortableContext
          items={stranky.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stranky.map((s, i) => (
              <Dlazdice
                key={s.id}
                stranka={s}
                poradi={i + 1}
                nahled={nahledy[s.id]}
                zdroj={zdroje.find((z) => z.id === s.zdrojId)}
                onOtocit={() => otocit(s.id)}
                onSmazat={() => smazat(s.id)}
                onOrez={() => setOrezId(s.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {orezStranka && orezZdroj && (
        <OrezEditor
          stranka={orezStranka}
          zdroj={orezZdroj}
          rozmerMm={orezRozmer}
          onUlozit={(o) => nastavitOrez(orezStranka.id, o)}
          onZavrit={() => setOrezId(null)}
        />
      )}
    </div>
  );
}

function Dlazdice({
  stranka,
  poradi,
  nahled,
  zdroj,
  onOtocit,
  onSmazat,
  onOrez,
}: {
  stranka: Stranka;
  poradi: number;
  nahled?: string;
  zdroj?: Zdroj;
  onOtocit: () => void;
  onSmazat: () => void;
  onOrez: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stranka.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderColor: "var(--linka)",
        background: "var(--panel)",
      }}
      className="rounded-lg border p-2"
    >
      <div
        {...attributes}
        {...listeners}
        className="relative cursor-grab active:cursor-grabbing"
      >
        <span
          className="absolute left-1 top-1 z-10 rounded px-1.5 py-0.5 text-xs font-bold text-white"
          style={{ background: "var(--modra)" }}
        >
          {poradi}
        </span>
        <div
          className="flex h-40 items-center justify-center overflow-hidden rounded"
          style={{ background: "var(--pozadi)" }}
        >
          {nahled ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nahled}
              alt={`Stránka ${poradi}`}
              className="max-h-full max-w-full object-contain transition-transform"
              style={{ transform: `rotate(${stranka.rotace}deg)` }}
            />
          ) : (
            <span className="text-xs" style={{ color: "var(--tlumeny)" }}>
              náhled…
            </span>
          )}
        </div>
      </div>

      <p
        className="mt-2 truncate text-[11px]"
        style={{ color: "var(--tlumeny)" }}
        title={zdroj?.nazev}
      >
        {zdroj?.nazev}
      </p>

      <div className="mt-1 flex gap-1">
        <button
          type="button"
          onClick={onOtocit}
          className="flex-1 rounded border px-2 py-1 text-xs hover:opacity-80"
          style={{ borderColor: "var(--linka)" }}
        >
          Otočit
        </button>
        <button
          type="button"
          onClick={onOrez}
          className="flex-1 rounded border px-2 py-1 text-xs hover:opacity-80"
          style={{
            borderColor: stranka.orez ? "var(--modra)" : "var(--linka)",
            color: stranka.orez ? "var(--modra)" : undefined,
          }}
        >
          {stranka.orez ? "Ořez ✓" : "Ořez"}
        </button>
        <button
          type="button"
          onClick={onSmazat}
          className="rounded border px-2 py-1 text-xs hover:opacity-80"
          style={{ borderColor: "var(--linka)", color: "var(--cervena)" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
