"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import CopyButton from "./CopyButton";
import FoxMark from "./FoxMark";
import { displayModelName } from "@/lib/brand";
import { DEFAULT_MODEL, type ModelInfo } from "@/lib/chat";

interface Props {
  open: boolean;
  onClose: () => void;
  token: string;
  keys: number;
  models: ModelInfo[];
  model: string; // model yang sedang dipilih di chat, dipakai di contoh kode
}

type Tab = "curl" | "python" | "javascript" | "n8n";

const TABS: { id: Tab; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "n8n", label: "n8n / LangChain" },
];

const lines = (...l: string[]) => l.join("\n");

// Contoh kode memakai format OpenAI, jadi library OpenAI mana pun cukup diganti base URL-nya.
function snippet(tab: Tab, base: string, token: string, model: string): { lang: string; code: string } {
  switch (tab) {
    case "curl":
      return {
        lang: "bash",
        code: lines(
          `curl ${base}/chat/completions \\`,
          `  -H "Authorization: Bearer ${token}" \\`,
          '  -H "Content-Type: application/json" \\',
          `  -d '{"model": "${model}", "messages": [{"role": "user", "content": "Halo!"}]}'`,
        ),
      };
    case "python":
      return {
        lang: "python",
        code: lines(
          "from openai import OpenAI",
          "",
          "client = OpenAI(",
          `    base_url="${base}",`,
          `    api_key="${token}",`,
          ")",
          "",
          "resp = client.chat.completions.create(",
          `    model="${model}",`,
          '    messages=[{"role": "user", "content": "Halo!"}],',
          ")",
          "print(resp.choices[0].message.content)",
        ),
      };
    case "javascript":
      return {
        lang: "javascript",
        code: lines(
          `const res = await fetch("${base}/chat/completions", {`,
          '  method: "POST",',
          "  headers: {",
          `    Authorization: "Bearer ${token}",`,
          '    "Content-Type": "application/json",',
          "  },",
          "  body: JSON.stringify({",
          `    model: "${model}",`,
          '    messages: [{ role: "user", content: "Halo!" }],',
          "  }),",
          "});",
          "const data = await res.json();",
          "console.log(data.choices[0].message.content);",
        ),
      };
    case "n8n":
      return {
        lang: "python",
        code: lines(
          "# n8n: Credentials → OpenAI",
          `#   API Key  : ${token}`,
          `#   Base URL : ${base}`,
          `#   Model    : ${model}  (ketik manual jika tidak muncul di daftar)`,
          "",
          "# LangChain (Python)",
          "from langchain_openai import ChatOpenAI",
          "",
          `llm = ChatOpenAI(base_url="${base}", api_key="${token}", model="${model}")`,
          'print(llm.invoke("Halo!").content)',
        ),
      };
  }
}

const STATUS: [string, string][] = [
  ["401", "Token salah. Cek nilai GATEWAY_TOKEN."],
  ["403", "Model khusus akun berbayar (jatah gratis 0). Pilih model lain."],
  ["429", "Semua key sedang habis kuota. Limit per menit pulih ±1 menit; limit harian reset ±15.00–16.00 WITA."],
  ["502", "Semua key ditolak Google, atau gateway gagal menghubungi Google."],
  ["503", "Model sedang sibuk di sisi Google. Coba lagi sebentar atau pakai model lain."],
];

// Panduan memakai API gabungan dari project lain (dibuka dari tombol di sidebar).
export default function ApiGuide({ open, onClose, token, keys, models, model }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("curl");
  const [revealed, setRevealed] = useState(false);

  // <dialog> bawaan: menahan fokus di dalam, Escape menutup, dan fokus kembali ke tombol pembuka.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open) {
      if (dialog.open) dialog.close();
      setRevealed(false);
    }
  }, [open]);

  const base = typeof window === "undefined" ? "/api/v1" : `${window.location.origin}/api/v1`;
  const shownToken = revealed ? token : "TOKEN_KAMU";
  const current = snippet(tab, base, shownToken, model);
  const list = models.length > 0 ? models : [{ id: model, name: model }];

  return (
    <dialog
      ref={ref}
      className="guide"
      aria-labelledby="guide-title"
      onClose={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose(); // klik di luar panel
      }}
    >
      <header className="guide-head">
        <FoxMark />
        <div className="guide-head-text">
          <h2 id="guide-title">Cara pakai API</h2>
          <p>
            Satu URL dan satu token untuk {keys} key Gemini. Formatnya kompatibel OpenAI, jadi bisa dipakai dari
            project mana pun.
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup panduan" title="Tutup">
          <X size={19} />
        </button>
      </header>

      <div className="guide-body">
        <section>
          <h3 className="guide-label">1 · Kredensial</h3>
          <div className="cred">
            <div className="cred-row">
              <span className="cred-key">Base URL</span>
              <code>{base}</code>
              <CopyButton text={base} label="Salin base URL" small />
            </div>
            <div className="cred-row">
              <span className="cred-key">API key</span>
              <code>{revealed ? token : `••••••••${token.slice(-4)}`}</code>
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => setRevealed(r => !r)}
                aria-label={revealed ? "Sembunyikan token" : "Tampilkan token di kredensial dan contoh kode"}
                title={revealed ? "Sembunyikan token" : "Tampilkan token di kredensial dan contoh kode"}
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <CopyButton text={token} label="Salin token" small />
            </div>
          </div>
          <p className="guide-note">
            API key = nilai <code>GATEWAY_TOKEN</code>. Simpan di server atau file <code>.env</code> project-mu,
            jangan di kode frontend yang bisa dilihat orang lain.
          </p>
        </section>

        <section>
          <h3 className="guide-label">2 · Contoh kode</h3>
          <div className="tabs" role="tablist" aria-label="Bahasa contoh kode">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="code" role="tabpanel">
            <div className="code-head">
              <span>{current.lang}</span>
              <CopyButton text={current.code} label="Salin kode" small />
            </div>
            <pre>
              <code>{current.code}</code>
            </pre>
          </div>
          <p className="guide-note">
            {revealed ? "Token asli sudah disisipkan di kode." : <>Ganti <code>TOKEN_KAMU</code> dengan token, atau klik ikon mata di atas untuk menyisipkannya.</>}{" "}
            Tambahkan <code>&quot;stream&quot;: true</code> untuk jawaban panjang.
          </p>
        </section>

        <section>
          <h3 className="guide-label">3 · Model</h3>
          <p className="guide-note guide-note-top">
            Di API pakai id asli di kiri. Di chat, model yang sama tampil dengan nama Vulpes.
          </p>
          <ul className="model-list">
            {list.map(m => (
              <li key={m.id}>
                <code>{m.id}</code>
                {m.id === DEFAULT_MODEL && <span className="tag tag-default">default</span>}
                <span className="alias">{m.name !== m.id ? displayModelName(m.name) : ""}</span>
                <CopyButton text={m.id} label={`Salin id ${m.id}`} small />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="guide-label">4 · Endpoint</h3>
          <dl className="kv-list">
            <div className="kv-row">
              <dt>POST /chat/completions</dt>
              <dd>Kirim chat. Mendukung streaming dengan &quot;stream&quot;: true.</dd>
            </div>
            <div className="kv-row">
              <dt>GET /models</dt>
              <dd>Daftar model (dipakai juga untuk tes kredensial di n8n).</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="guide-label">5 · Kode status</h3>
          <dl className="kv-list kv-status">
            {STATUS.map(([code, text]) => (
              <div key={code} className="kv-row">
                <dt>{code}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </dialog>
  );
}
