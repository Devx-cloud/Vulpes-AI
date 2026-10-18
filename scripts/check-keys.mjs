// Cek setiap key di GEMINI_KEYS: npm run check-keys
// Membaca .env jika ada; GEMINI_KEYS dari environment tetap diutamakan.
import { existsSync } from "node:fs";

if (!process.env.GEMINI_KEYS && existsSync(".env")) process.loadEnvFile(".env");

const keys = (process.env.GEMINI_KEYS ?? "").split(",").map(k => k.trim()).filter(Boolean);
if (keys.length === 0) {
  console.error("GEMINI_KEYS kosong. Isi .env.local atau set environment variable.");
  process.exit(1);
}

const meaning = {
  200: "valid",
  429: "valid, kuota sedang habis",
};

for (const [i, key] of keys.entries()) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", {
    headers: { authorization: `Bearer ${key}`, "x-goog-api-key": key },
  });
  const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
  let line = `key ${i + 1} (${masked}): ${res.status} ${meaning[res.status] ?? "DITOLAK"}`;
  if (!(res.status in meaning)) {
    // Tampilkan alasan singkat dari Google, misalnya API_KEY_INVALID atau ACCESS_TOKEN_TYPE_UNSUPPORTED.
    const body = await res.text();
    const reason = body.match(/"reason":\s*"([^"]+)"/)?.[1] ?? body.slice(0, 120).replace(/\s+/g, " ");
    line += ` - ${reason}`;
  } else {
    await res.body?.cancel();
  }
  console.log(line);
}
