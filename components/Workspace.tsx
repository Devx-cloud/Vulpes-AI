"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Menu, Plus } from "lucide-react";
import ApiGuide from "./ApiGuide";
import Composer, { type Suggestion } from "./Composer";
import FoxMark from "./FoxMark";
import FoxTrail from "./FoxTrail";
import MessageView from "./MessageView";
import Sidebar from "./Sidebar";
import { APP_NAME, PERSONA } from "@/lib/brand";
import {
  AuthError,
  DEFAULT_MODEL,
  errorText,
  fetchModels,
  pickModel,
  streamChat,
  stripThought,
  titleFrom,
  uid,
  type Conversation,
  type Message,
  type ModelInfo,
} from "@/lib/chat";
import { loadChats, loadFlag, loadModel, saveChats, saveFlag, saveModel } from "@/lib/storage";
import { cls, greeting } from "@/lib/ui";

// Chip di layar sambutan: mengisi kotak input dengan awalan pertanyaan.
const SUGGESTIONS: Suggestion[] = [
  { label: "Jelaskan sederhana", prompt: "Jelaskan dengan bahasa sederhana: " },
  { label: "Ringkas teks", prompt: "Ringkas teks berikut menjadi poin-poin penting:\n\n" },
  { label: "Perbaiki kode", prompt: "Tolong periksa dan perbaiki kode ini:\n\n" },
  { label: "Terjemahkan", prompt: "Terjemahkan ke bahasa Inggris: " },
];

interface Props {
  token: string;
  keys: number;
  onLock: (notice?: string) => void;
}

// Layar utama setelah token benar: sidebar riwayat + area chat.
// Komponen ini hanya dirender di browser (lihat ChatApp), jadi aman membaca localStorage saat inisialisasi.
export default function Workspace({ token, keys, onLock }: Props) {
  const [chats, setChats] = useState<Conversation[]>(loadChats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState("");
  const [model, setModel] = useState(() => loadModel() ?? DEFAULT_MODEL);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => loadFlag("sidebar-collapsed"));
  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // ikuti jawaban ke bawah selama pengguna tidak menggulir ke atas

  const active = chats.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchModels(token)
      .then(list => {
        if (cancelled) return;
        setModels(list);
        setModel(m => pickModel(m, list));
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof AuthError) onLock(err.message);
        else setModelsError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token, onLock]);

  // Simpan riwayat dengan jeda singkat supaya tidak menulis storage di setiap potongan stream.
  useEffect(() => {
    const timer = setTimeout(() => saveChats(chats), 300);
    return () => clearTimeout(timer);
  }, [chats]);

  useEffect(() => saveModel(model), [model]);
  useEffect(() => saveFlag("sidebar-collapsed", collapsed), [collapsed]);

  const lastMessage = active?.messages.at(-1);
  useEffect(() => {
    const el = threadRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [activeId, active?.messages.length, lastMessage?.content]);

  const updateChat = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setChats(cs => cs.map(c => (c.id === id ? fn(c) : c)));
  }, []);

  const patchMessage = useCallback(
    (chatId: string, msgId: string, fn: (m: Message) => Message) => {
      updateChat(chatId, c => ({ ...c, messages: c.messages.map(m => (m.id === msgId ? fn(m) : m)) }));
    },
    [updateChat],
  );

  async function respond(chatId: string, history: Message[]) {
    const reply: Message = { id: uid(), role: "assistant", content: "", model };
    updateChat(chatId, c => ({ ...c, messages: [...c.messages, reply], updatedAt: Date.now() }));
    setStreamingId(reply.id);
    stickRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    // Selama streaming teks mentah disimpan apa adanya (tag <thought> bisa terpotong antar potongan).
    // Setelah selesai, blok <thought> Gemma dibuang supaya tidak tersimpan dan tidak ikut jadi konteks.
    try {
      await streamChat({
        token,
        model,
        signal: controller.signal,
        // Persona Vulpes di depan; jawaban gagal/kosong tidak ikut dikirim sebagai konteks.
        messages: [
          { role: "system", content: PERSONA },
          ...history.filter(m => m.content && !m.error).map(({ role, content }) => ({ role, content })),
        ],
        onDelta: text => patchMessage(chatId, reply.id, m => ({ ...m, content: m.content + text })),
      });
      patchMessage(chatId, reply.id, m => {
        const content = stripThought(m.content);
        if (content) return { ...m, content };
        const error = `${APP_NAME} tidak mengirim jawaban (mungkin diblokir filter keamanan). Coba ubah pertanyaannya.`;
        return { ...m, content, error };
      });
    } catch (err) {
      if (err instanceof AuthError) onLock(err.message);
      else {
        const result = controller.signal.aborted ? { stopped: true } : { error: errorText(err) };
        patchMessage(chatId, reply.id, m => ({ ...m, content: stripThought(m.content), ...result }));
      }
    } finally {
      abortRef.current = null;
      setStreamingId(null);
    }
  }

  function send(text: string) {
    if (streamingId) return;
    const userMsg: Message = { id: uid(), role: "user", content: text };
    const chatId = active?.id ?? uid();
    if (active) {
      updateChat(chatId, c => ({ ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }));
    } else {
      setChats(cs => [{ id: chatId, title: titleFrom(text), messages: [userMsg], updatedAt: Date.now() }, ...cs]);
      setActiveId(chatId);
    }
    void respond(chatId, [...(active?.messages ?? []), userMsg]);
  }

  function regenerate() {
    if (!active || streamingId) return;
    const base = active.messages.at(-1)?.role === "assistant" ? active.messages.slice(0, -1) : active.messages;
    updateChat(active.id, c => ({ ...c, messages: base }));
    void respond(active.id, base);
  }

  function openChat(id: string | null) {
    setActiveId(id);
    setDrawerOpen(false);
    stickRef.current = true;
  }

  function deleteChat(id: string) {
    if (!window.confirm("Hapus percakapan ini?")) return;
    const chat = chats.find(c => c.id === id);
    if (streamingId && chat?.messages.some(m => m.id === streamingId)) abortRef.current?.abort();
    setChats(cs => cs.filter(c => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  function clearAll() {
    if (!window.confirm("Hapus semua riwayat percakapan di perangkat ini?")) return;
    abortRef.current?.abort();
    setChats([]);
    setActiveId(null);
  }

  const composer = {
    busy: streamingId !== null,
    onSend: send,
    onStop: () => abortRef.current?.abort(),
    models,
    modelsError,
    model,
    onModelChange: setModel,
  };

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeId={activeId}
        collapsed={collapsed}
        open={drawerOpen}
        keys={keys}
        token={token}
        onToggleCollapsed={() => setCollapsed(c => !c)}
        onClose={() => setDrawerOpen(false)}
        onNew={() => openChat(null)}
        onSelect={openChat}
        onDelete={deleteChat}
        onClearAll={clearAll}
        onLock={() => onLock()}
        onOpenGuide={() => {
          setDrawerOpen(false);
          setGuideOpen(true);
        }}
      />
      {drawerOpen && <div className="backdrop" onClick={() => setDrawerOpen(false)} />}
      <ApiGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        token={token}
        keys={keys}
        models={models}
        model={model}
      />

      <main className={cls("main", !active && "is-welcome")}>
        <header className="topbar">
          <div className="topbar-start">
            <button type="button" className="icon-btn only-mobile" onClick={() => setDrawerOpen(true)} aria-label="Buka menu">
              <Menu size={20} />
            </button>
            {active ? (
              <span className="topbar-title">{active.title}</span>
            ) : (
              <span className="topbar-brand">
                <FoxMark />
                {APP_NAME}
              </span>
            )}
          </div>
          <div className="topbar-actions">
            {active && (
              <button type="button" className="btn btn-ghost" onClick={() => openChat(null)} title="Percakapan baru">
                <Plus size={17} strokeWidth={2.25} />
                <span>Chat baru</span>
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => onLock()}
              aria-label="Keluar & ganti token"
              title="Keluar & ganti token"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {active ? (
          <>
            <div
              className="thread"
              ref={threadRef}
              onScroll={e => {
                const el = e.currentTarget;
                stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              <div className="thread-inner">
                {active.messages.map((m, i) => (
                  <MessageView
                    key={m.id}
                    message={m}
                    streaming={m.id === streamingId}
                    onRetry={
                      i === active.messages.length - 1 && m.role === "assistant" && !streamingId ? regenerate : undefined
                    }
                  />
                ))}
              </div>
            </div>
            <div className="dock">
              <Composer {...composer} />
              <p className="disclaimer">Jawaban AI bisa keliru, jadi periksa kembali. Jangan kirim data sensitif.</p>
            </div>
          </>
        ) : (
          <div className="welcome">
            <FoxTrail />
            <div className="welcome-inner">
              <p className="eyebrow">
                <span className="dot" />
                {greeting()} · {keys} key siap
              </p>
              <h1 className="welcome-title">
                Mau tanya <em>apa</em> hari ini?
              </h1>
              <Composer {...composer} autoFocus suggestions={SUGGESTIONS} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
