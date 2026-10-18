#!/usr/bin/env node
// Uji model chat mana yang bisa dipakai key tier gratis: kirim satu pesan pendek ke setiap model.
// Memakai 1 request per model (model berbayar/pensiun ditolak tanpa memakai kuota).
//
//   node .claude/skills/gemini-gateway/scripts/test-models.mjs [--key 1] [--env .env]
//
// Hasilnya dipakai untuk memperbarui daftar UNAVAILABLE di lib/chat.ts.
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: opt } = parseArgs({
  options: { key: { type: "string", default: "1" }, env: { type: "string", default: ".env" } },
});
const raw = process.env.GEMINI_KEYS ?? (existsSync(opt.env) ? readFileSync(opt.env, "utf8").match(/^GEMINI_KEYS=(.*)$/m)?.[1] : "");
const keys = (raw ?? "").split(",").map(k => k.trim()).filter(Boolean);
const key = keys[Number(opt.key) - 1];
if (!key) throw new Error(`Key ke-${opt.key} tidak ada di GEMINI_KEYS (${keys.length} key)`);

const BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const headers = { authorization: `Bearer ${key}`, "x-goog-api-key": key, "content-type": "application/json" };

// Samakan dengan NON_CHAT di lib/chat.ts. UNAVAILABLE sengaja tidak dipakai di sini,
// supaya model yang disembunyikan ikut diuji ulang (siapa tahu sudah tersedia lagi).
const NON_CHAT =
  /tts|image|embedding|live|audio|robotics|computer-use|transcribe|translate|banana|veo|lyria|aqa|research|antigravity|customtools/;

const list = await (await fetch(`${BASE}/models`, { headers })).json();
const ids = list.data
  .map(m => m.id.replace(/^models\//, ""))
  .filter(id => /^(gemini|gemma)-/.test(id) && !NON_CHAT.test(id));

const messageOf = text => {
  try {
    const body = JSON.parse(text);
    return (Array.isArray(body) ? body[0] : body)?.error?.message ?? text;
  } catch {
    return text;
  }
};

console.log(`Key ke-${opt.key}, ${ids.length} model chat\n`);
const unavailable = [];
for (const id of ids) {
  const t0 = Date.now();
  let verdict;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: id, messages: [{ role: "user", content: "Balas dengan satu kata saja: OK" }] }),
      signal: AbortSignal.timeout(120000),
    });
    const text = await res.text();
    if (res.ok) verdict = "BISA";
    else if (res.status === 404) verdict = "TIDAK: dipensiunkan (404)";
    else if (res.status === 429 && /free_tier\w*, limit: 0\b/.test(text)) verdict = "TIDAK: khusus berbayar (limit 0)";
    else if (res.status === 429) verdict = "kuota sedang habis (429), coba key lain";
    else if (res.status === 503) verdict = "sibuk (503), coba lagi nanti";
    else verdict = `error ${res.status}: ${messageOf(text).replace(/\s+/g, " ").slice(0, 100)}`;
  } catch (e) {
    verdict = `error: ${e.message}`;
  }
  if (verdict.startsWith("TIDAK")) unavailable.push(id);
  const secs = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
  console.log(`${id.padEnd(32)} ${secs}s  ${verdict}`);
}

console.log(`\nIsi yang disarankan untuk UNAVAILABLE di lib/chat.ts (${unavailable.length} model):`);
console.log(unavailable.map(id => `  "${id}",`).join("\n") || "  (kosong)");
