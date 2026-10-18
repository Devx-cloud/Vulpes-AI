"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { APP_NAME, displayModelId, displayModelName } from "@/lib/brand";
import { DEFAULT_MODEL, type ModelInfo } from "@/lib/chat";
import { cls, useDismiss } from "@/lib/ui";

interface Props {
  models: ModelInfo[];
  modelsError: string;
  model: string;
  onChange: (id: string) => void;
}

// Arah buka dan tinggi menu dihitung dari ruang kosong di atas/bawah tombol,
// supaya menu tidak pernah terpotong tepi layar (misalnya di jendela yang pendek).
interface Placement {
  side: "top" | "bottom";
  maxHeight: number;
}

const EDGE = 12; // jarak minimal menu ke tepi layar
const GAP = 8; // jarak menu ke tombol

function tagOf(id: string): string | null {
  if (id === DEFAULT_MODEL) return "default";
  if (id.endsWith("-latest")) return "otomatis";
  if (id.includes("lite")) return "cepat";
  return null;
}

export default function ModelPicker({ models, modelsError, model, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Placement>({ side: "top", maxHeight: 360 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useDismiss(anchorRef, open, () => setOpen(false));

  const options = models.length > 0 ? models : [{ id: model, name: model }];
  // Nama tampilan memakai merek Vulpes; id asli tetap dipakai saat memilih (lihat lib/brand.ts).
  const groups = [
    { label: APP_NAME, items: options.filter(m => !m.id.startsWith("gemma")) },
    { label: "Model terbuka", items: options.filter(m => m.id.startsWith("gemma")) },
  ].filter(g => g.items.length > 0);
  const current = options.find(m => m.id === model);
  const label = current && current.name !== current.id ? displayModelName(current.name) : displayModelId(model);

  // Dihitung sebelum menu tampil (useLayoutEffect), jadi tidak ada kedipan posisi.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const list = listRef.current;
      if (!anchor || !list) return;
      const below = window.innerHeight - anchor.bottom - GAP - EDGE;
      const above = anchor.top - GAP - EDGE;
      const need = list.scrollHeight;
      // Utamakan ke bawah jika muat minimal ±5 model; selain itu pilih sisi yang lebih lega.
      const side = below >= Math.min(need, 300) || below >= above ? "bottom" : "top";
      setPlace({ side, maxHeight: Math.max(120, Math.min(need, side === "bottom" ? below : above)) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, options.length]);

  // Saat dibuka, fokus ke model terpilih supaya bisa langsung dipilih dengan tombol panah.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const target =
      list?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list?.querySelector<HTMLElement>('[role="option"]');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest" });
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKey(e: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") focusAt(index + 1);
    else if (e.key === "ArrowUp") focusAt(index - 1);
    else if (e.key === "Home") focusAt(0);
    else if (e.key === "End") focusAt(items.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div className="menu-anchor" ref={anchorRef}>
      <button
        ref={buttonRef}
        type="button"
        className="model-chip"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${label}. Ganti model`}
        title="Ganti model"
      >
        <span className="gem" aria-hidden="true" />
        <span className="name">{label}</span>
        <ChevronDown size={15} />
      </button>

      {open && (
        <div
          ref={listRef}
          className={cls("menu model-menu", place.side === "top" ? "is-top" : "is-bottom")}
          style={{ maxHeight: place.maxHeight }}
          role="listbox"
          aria-label="Pilih model"
          onKeyDown={onListKey}
        >
          <div className="menu-head">
            <span>Pilih model</span>
            <span>{options.length}</span>
          </div>
          {modelsError && <p className="menu-note">Daftar model gagal dimuat: {modelsError}</p>}
          {groups.map(g => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="menu-group">{g.label}</div>
              {g.items.map(m => {
                const tag = tagOf(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={m.id === model}
                    className="option"
                    onClick={() => choose(m.id)}
                  >
                    <span className="option-text">
                      <span className="option-name">
                        {m.name !== m.id ? displayModelName(m.name) : displayModelId(m.id)}
                        {tag && <span className={cls("tag", tag === "default" && "tag-default")}>{tag}</span>}
                      </span>
                      <span className="option-id">{displayModelId(m.id)}</span>
                    </span>
                    {m.id === model && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
