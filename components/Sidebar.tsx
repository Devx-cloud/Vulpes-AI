"use client";

import { useMemo, useRef, useState } from "react";
import { CodeXml, LogOut, PanelLeft, Plus, Search, Settings, Trash2, X } from "lucide-react";
import FoxMark from "./FoxMark";
import { Paw } from "./FoxTrail";
import { APP_NAME } from "@/lib/brand";
import { cls, dateGroup, useDismiss } from "@/lib/ui";
import type { Conversation } from "@/lib/chat";

interface Props {
  chats: Conversation[];
  activeId: string | null;
  collapsed: boolean; // desktop: diciutkan jadi rel ikon
  open: boolean; // mobile: drawer terbuka
  keys: number;
  token: string;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onLock: () => void;
  onOpenGuide: () => void;
}

const MAX_SEGMENTS = 12;

export default function Sidebar(props: Props) {
  const { chats, activeId, collapsed, open, keys, token } = props;
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismiss(menuRef, menuOpen, () => setMenuOpen(false));

  // Riwayat terbaru di atas, dikelompokkan per tanggal (Hari ini, Kemarin, ...).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(c => !q || c.title.toLowerCase().includes(q));
    const out: { label: string; items: Conversation[] }[] = [];
    for (const c of list) {
      const label = dateGroup(c.updatedAt);
      let group = out.at(-1);
      if (group?.label !== label) {
        group = { label, items: [] };
        out.push(group);
      }
      group.items.push(c);
    }
    return out;
  }, [chats, query]);

  return (
    <aside className={cls("sidebar", collapsed && "is-collapsed", open && "is-open")}>
      <div className="sb-head">
        <div className="brand">
          <FoxMark />
          <span className="brand-name">{APP_NAME}</span>
        </div>
        <button
          type="button"
          className="icon-btn only-desktop"
          onClick={props.onToggleCollapsed}
          aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
          title={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
        >
          <PanelLeft size={19} />
        </button>
        <button type="button" className="icon-btn only-mobile" onClick={props.onClose} aria-label="Tutup menu">
          <X size={20} />
        </button>
      </div>

      {/* Kelompok aksi: dipisah garis dari riwayat supaya tidak bercampur. */}
      <div className="sb-actions">
        <button type="button" className="sb-new" onClick={props.onNew} title="Percakapan baru">
          <Plus size={18} strokeWidth={2.25} />
          <span>Percakapan baru</span>
        </button>
        <button
          type="button"
          className="sb-link"
          onClick={props.onOpenGuide}
          title="Cara memakai API gabungan dari project lain"
        >
          <CodeXml size={18} />
          <span>Cara pakai API</span>
        </button>
      </div>

      <hr className="sb-divider" />

      <section className="sb-history sb-wide" aria-label="Riwayat percakapan">
        <div className="sb-history-head">
          <span>Riwayat</span>
          {chats.length > 0 && <span className="sb-count">{chats.length}</span>}
        </div>

        {chats.length > 0 && (
          <label className="sb-search">
            <Search size={15} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari percakapan" />
          </label>
        )}

        <div className="sb-scroll">
          {chats.length === 0 ? (
            <div className="sb-empty-state">
              <Paw className="sb-empty-icon" />
              <p>Belum ada percakapan</p>
              <small>Mulai lewat tombol Percakapan baru.</small>
            </div>
          ) : groups.length === 0 ? (
            <p className="sb-empty">Tidak ada yang cocok.</p>
          ) : (
            groups.map(g => (
              <section key={g.label} className="sb-group">
                <div className="sb-label">{g.label}</div>
                <ul className="sb-list">
                  {g.items.map(c => (
                    <li key={c.id} className={cls("sb-chat", c.id === activeId && "is-active")}>
                      <button
                        type="button"
                        className="sb-chat-title"
                        onClick={() => props.onSelect(c.id)}
                        title={c.title}
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm sb-chat-del"
                        onClick={() => props.onDelete(c.id)}
                        aria-label={`Hapus percakapan ${c.title}`}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </section>

      <div className="sb-foot">
        {/* Setiap key digambarkan sebagai satu ruas ekor rubah (merah, ujungnya krem). */}
        <div className="pool sb-wide">
          <div className="tail" aria-hidden="true">
            {Array.from({ length: Math.min(keys, MAX_SEGMENTS) }, (_, i) => (
              <i key={i} />
            ))}
            {keys > MAX_SEGMENTS && <span className="tail-more">+{keys - MAX_SEGMENTS}</span>}
          </div>
          <div className="pool-text">
            <strong>{keys} key</strong> tergabung · ••••{token.slice(-4)}
          </div>
        </div>
        <div className="menu-anchor" ref={menuRef}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Pengaturan"
            aria-expanded={menuOpen}
            title="Pengaturan"
          >
            <Settings size={19} />
          </button>
          {menuOpen && (
            <div className="menu settings-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  props.onLock();
                }}
              >
                <LogOut size={17} />
                Keluar & ganti token
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  props.onClearAll();
                }}
              >
                <Trash2 size={17} />
                Hapus semua riwayat
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
