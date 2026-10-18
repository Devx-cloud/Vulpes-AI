"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import ModelPicker from "./ModelPicker";
import { APP_NAME } from "@/lib/brand";
import { cls } from "@/lib/ui";
import type { ModelInfo } from "@/lib/chat";

// Web Speech API belum ada di tipe DOM TypeScript; cukup bagian yang dipakai.
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getSpeech(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface Suggestion {
  label: string;
  prompt: string; // teks awal yang diisikan ke kotak input
}

interface Props {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  models: ModelInfo[];
  modelsError: string;
  model: string;
  onModelChange: (id: string) => void;
  autoFocus?: boolean;
  suggestions?: Suggestion[];
}

export default function Composer(props: Props) {
  const { busy, onSend, onStop, autoFocus, suggestions } = props;
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [Speech] = useState(getSpeech); // undefined di browser tanpa dukungan (mis. Firefox)
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<Recognition | null>(null);

  // Tinggi textarea mengikuti isi, maksimal 220px (selebihnya scroll).
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => () => recRef.current?.stop(), []);

  function submit() {
    const value = text.trim();
    if (!value || busy) return;
    recRef.current?.stop();
    onSend(value);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter kirim, Shift+Enter baris baru. isComposing: jangan kirim saat IME masih mengetik.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function toggleMic() {
    if (listening) return recRef.current?.stop();
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = "id-ID";
    rec.interimResults = false;
    rec.onresult = e => {
      const said = Array.from(e.results, r => r[0].transcript).join(" ");
      setText(t => (t ? `${t} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function applySuggestion(prompt: string) {
    setText(prompt);
    // Tunggu teks masuk ke textarea, lalu taruh kursor di akhir.
    requestAnimationFrame(() => {
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(prompt.length, prompt.length);
    });
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Tanya ${APP_NAME}…`}
          aria-label="Pesan"
          autoFocus={autoFocus}
        />
        <div className="composer-bar">
          <ModelPicker
            models={props.models}
            modelsError={props.modelsError}
            model={props.model}
            onChange={props.onModelChange}
          />
          <div className="composer-actions">
            {Speech && !busy && (
              <button
                type="button"
                className={cls("round-btn", listening && "is-listening")}
                onClick={toggleMic}
                aria-label={listening ? "Berhenti mendengarkan" : "Bicara"}
                title={listening ? "Berhenti mendengarkan" : "Bicara"}
              >
                <Mic size={18} />
              </button>
            )}
            {busy ? (
              <button type="button" className="round-btn is-stop" onClick={onStop} aria-label="Hentikan jawaban" title="Hentikan">
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                className="round-btn is-send"
                onClick={submit}
                disabled={!text.trim()}
                aria-label="Kirim"
                title="Kirim (Enter)"
              >
                <ArrowUp size={18} strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
      </div>

      {suggestions && (
        <div className="suggestions">
          {suggestions.map(s => (
            <button key={s.label} type="button" className="chip" onClick={() => applySuggestion(s.prompt)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
