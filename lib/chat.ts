// Tipe data dan pemanggil API untuk UI chat (berjalan di browser).

export const DEFAULT_MODEL = "gemini-3.8-flash";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string; // diisi jika jawaban gagal
  stopped?: boolean; // dihentikan pengguna di tengah jalan
  model?: string; // model yang menjawab (hanya untuk pesan assistant)
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ModelInfo {
  id: string;
  name: string;
}

// 401 dari gateway: token salah atau sudah diganti di server.
export class AuthError extends Error {}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function titleFrom(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 48 ? `${flat.slice(0, 48)}…` : flat;
}

// Gemma menulis proses berpikirnya di awal jawaban: "<thought>…</thought>jawaban".
// Hanya jawabannya yang dipakai; blok yang belum ditutup (masih streaming) ikut dibuang.
export function stripThought(text: string): string {
  return text.replace(/^\s*<thought>[\s\S]*?(?:<\/thought>|$)/, "").trimStart();
}

export function errorText(err: unknown): string {
  // fetch melempar TypeError saat jaringan putus ("Failed to fetch", Safari: "Load failed").
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return "Tidak bisa terhubung ke gateway. Cek koneksi internet.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.charAt(0).toUpperCase() + msg.slice(1);
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

// Gateway membalas {error: "..."}, Gemini membalas {error: {message}} atau [{error: {message}}].
function messageFrom(body: unknown): string | undefined {
  const first = Array.isArray(body) ? body[0] : body;
  const err = (first as { error?: unknown } | null)?.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String(err.message);
  return undefined;
}

async function readError(res: Response): Promise<Error> {
  if (res.status === 401) {
    return new AuthError("Token salah atau sudah diganti. Masukkan token yang benar.");
  }
  if (res.status === 429) {
    return new Error(
      "Semua key sedang habis kuota. Limit per menit pulih sekitar 1 menit; limit harian reset sekitar pukul 15.00–16.00 WITA.",
    );
  }
  const text = await res.text().catch(() => "");
  try {
    const message = messageFrom(JSON.parse(text));
    if (message) return new Error(message);
  } catch {
    // bukan JSON
  }
  return new Error(text.slice(0, 200) || `Gateway membalas HTTP ${res.status}`);
}

// Mengembalikan jumlah key di gateway jika token benar.
export async function verifyToken(token: string): Promise<number> {
  const res = await fetch("/api/verify", { headers: auth(token), cache: "no-store" });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { keys: number };
  return body.keys;
}

// Model non-chat (gambar, suara, embedding, video, dll.) disembunyikan dari pilihan.
const NON_CHAT =
  /tts|image|embedding|live|audio|robotics|computer-use|transcribe|translate|banana|veo|lyria|aqa|research|antigravity|customtools/;

// Model yang tidak bisa dipakai key tier gratis (dicek 17 Oktober 2026). Seri 2.5 dibalas 404
// "no longer available to new users"; sisanya jatah gratisnya 0 (khusus akun berbayar).
// Perbarui daftar ini jika Google mengubah ketersediaan model.
const UNAVAILABLE = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-4-argon",
  "gemini-3.1-pro-preview",
  "gemini-pro-latest",
  "gemini-omni-flash-preview",
  "gemini-omni-1.1-flash",
]);

// Urutkan versi terbaru di atas; alias "-latest" lalu Gemma di bawah.
function rank(id: string): number {
  if (id.startsWith("gemma")) return -2;
  const version = id.match(/^gemini-(\d+(?:\.\d+)?)/);
  return version ? Number(version[1]) : -1;
}

export async function fetchModels(token: string): Promise<ModelInfo[]> {
  const res = await fetch("/api/v1/models", { headers: auth(token), cache: "no-store" });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data?: { id: string; display_name?: string }[] };
  return (body.data ?? [])
    .map(m => ({ id: m.id.replace(/^models\//, ""), name: m.display_name ?? m.id }))
    .filter(m => /^(gemini|gemma)-/.test(m.id) && !NON_CHAT.test(m.id) && !UNAVAILABLE.has(m.id))
    .sort((a, b) => rank(b.id) - rank(a.id));
}

// Model tersimpan dipakai jika masih ada di daftar; jika tidak, kembali ke default (atau model pertama).
export function pickModel(current: string, list: ModelInfo[]): string {
  if (list.length === 0 || list.some(m => m.id === current)) return current;
  return list.some(m => m.id === DEFAULT_MODEL) ? DEFAULT_MODEL : list[0].id;
}

interface StreamOptions {
  token: string;
  model: string;
  messages: { role: "system" | Message["role"]; content: string }[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

// Kirim chat dengan stream: true dan teruskan potongan teks (SSE) ke onDelta.
export async function streamChat({ token, model, messages, signal, onDelta }: StreamOptions) {
  const res = await fetch("/api/v1/chat/completions", {
    method: "POST",
    headers: { ...auth(token), "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw await readError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // baris terakhir mungkin belum lengkap
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      const chunk = JSON.parse(data);
      const message = messageFrom(chunk);
      if (message) throw new Error(message);
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) onDelta(text);
    }
  }
}
