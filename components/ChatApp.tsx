"use client";

import { useCallback, useEffect, useState } from "react";
import FoxMark from "./FoxMark";
import TokenGate from "./TokenGate";
import Workspace from "./Workspace";
import { AuthError, errorText, verifyToken } from "@/lib/chat";
import { clearToken, loadToken, saveToken } from "@/lib/storage";

type State =
  | { status: "loading" }
  | { status: "locked"; notice?: string; token?: string }
  | { status: "ready"; token: string; keys: number };

// Akar UI. Render pertama (termasuk di server) selalu splash, karena token baru bisa dibaca
// dari storage browser setelah mount. Ini juga mencegah hydration mismatch.
export default function ChatApp() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const token = loadToken();
    if (!token) return setState({ status: "locked" });
    verifyToken(token)
      .then(keys => setState({ status: "ready", token, keys }))
      .catch(err => {
        // Token salah: buang. Gangguan lain (jaringan, server): simpan dan isi ulang di form.
        if (err instanceof AuthError) clearToken();
        setState({ status: "locked", notice: errorText(err), token: err instanceof AuthError ? undefined : token });
      });
  }, []);

  const lock = useCallback((notice?: string) => {
    clearToken();
    setState({ status: "locked", notice });
  }, []);

  if (state.status === "loading") {
    return (
      <div className="splash">
        <FoxMark className="splash-logo" glowing />
      </div>
    );
  }

  if (state.status === "locked") {
    return (
      <TokenGate
        notice={state.notice}
        initialToken={state.token}
        onUnlock={(token, keys, remember) => {
          saveToken(token, remember);
          setState({ status: "ready", token, keys });
        }}
      />
    );
  }

  return <Workspace token={state.token} keys={state.keys} onLock={lock} />;
}
