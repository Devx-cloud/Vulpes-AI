"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import FoxMark from "./FoxMark";
import FoxTrail from "./FoxTrail";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { errorText, verifyToken } from "@/lib/chat";

interface Props {
  notice?: string; // alasan kembali ke layar ini (token kedaluwarsa, gateway tidak bisa dihubungi, dll.)
  initialToken?: string;
  onUnlock: (token: string, keys: number, remember: boolean) => void;
}

// Layar wajib sebelum chat: token dicek ke /api/verify (tanpa memakai kuota Gemini).
export default function TokenGate({ notice, initialToken = "", onUnlock }: Props) {
  const [token, setToken] = useState(initialToken);
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice ?? "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = token.trim();
    if (!value) return setError("Token wajib diisi.");
    setBusy(true);
    setError("");
    try {
      onUnlock(value, await verifyToken(value), remember);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <FoxTrail />
      <form className="gate-card" onSubmit={submit}>
        <FoxMark className="gate-logo" glowing={busy} />
        <h1 className="gate-title">{APP_NAME}</h1>
        <p className="gate-tagline">{TAGLINE}</p>

        <label className="field-label" htmlFor="gate-token">
          Token akses
        </label>
        <div className="field">
          <KeyRound size={17} />
          <input
            id="gate-token"
            type={show ? "text" : "password"}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Tempel GATEWAY_TOKEN"
            autoComplete="current-password"
            spellCheck={false}
            autoFocus
          />
          <button
            type="button"
            className="icon-btn icon-btn-sm"
            onClick={() => setShow(s => !s)}
            aria-label={show ? "Sembunyikan token" : "Tampilkan token"}
            title={show ? "Sembunyikan token" : "Tampilkan token"}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <label className="check">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Ingat di perangkat ini
        </label>

        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Memeriksa…" : "Masuk"}
          {!busy && <ArrowRight size={17} />}
        </button>

        <p className="gate-hint">
          Token ada di <code>GATEWAY_TOKEN</code> pada file <code>.env</code> atau Environment Variables Vercel.
        </p>
      </form>
    </div>
  );
}
