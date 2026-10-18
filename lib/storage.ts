// Penyimpanan di browser. Server tetap tanpa database: riwayat chat hanya ada di perangkat ini.
// Semua akses dibungkus try/catch karena storage bisa diblokir (mode privat, kebijakan browser).
import type { Conversation } from "./chat";

const TOKEN = "gw:token";
const CHATS = "gw:chats";
const MODEL = "gw:model";
const MAX_CHATS = 50;

type Kind = "local" | "session";

function get(kind: Kind, key: string): string | null {
  try {
    return (kind === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function set(kind: Kind, key: string, value: string | null) {
  try {
    const store = kind === "local" ? localStorage : sessionStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    // storage penuh atau diblokir: aplikasi tetap jalan tanpa menyimpan
  }
}

export function loadToken(): string | null {
  return get("local", TOKEN) ?? get("session", TOKEN);
}

// remember = true: tetap masuk setelah browser ditutup. false: hanya selama tab terbuka.
export function saveToken(token: string, remember: boolean) {
  set(remember ? "local" : "session", TOKEN, token);
  set(remember ? "session" : "local", TOKEN, null);
}

export function clearToken() {
  set("local", TOKEN, null);
  set("session", TOKEN, null);
}

export function loadChats(): Conversation[] {
  try {
    const list: unknown = JSON.parse(get("local", CHATS) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: Conversation[]) {
  const recent = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
  set("local", CHATS, JSON.stringify(recent));
}

export const loadModel = () => get("local", MODEL);
export const saveModel = (id: string) => set("local", MODEL, id);

export const loadFlag = (name: string) => get("local", `gw:${name}`) === "1";
export const saveFlag = (name: string, on: boolean) => set("local", `gw:${name}`, on ? "1" : null);
