import { timingSafeEqual } from "node:crypto";

const UPSTREAM = "https://generativelanguage.googleapis.com/v1beta/openai";

const KEYS = (process.env.GEMINI_KEYS ?? "")
  .split(",").map(k => k.trim()).filter(Boolean);

let current = 0; // key yang sedang dipakai (di memori)

export function keyCount(): number {
  return KEYS.length;
}

// Mengembalikan Response error jika token salah, atau null jika lolos.
export function checkAuth(req: Request): Response | null {
  const token = process.env.GATEWAY_TOKEN;
  if (!token) {
    // Tanpa ini, header "Bearer undefined" akan lolos.
    return Response.json({ error: "GATEWAY_TOKEN belum diatur" }, { status: 500 });
  }
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

// Model khusus akun berbayar: Google membalas 429 dengan jatah gratis "limit: 0",
// contoh: "...generate_content_free_tier_requests, limit: 0, model: gemini-3.1-pro".
const FREE_LIMIT_ZERO = /free_tier\w*, limit: 0\b/;

// Apakah error ini disebabkan oleh key (bukan oleh isi request)?
async function isKeyProblem(res: Response): Promise<boolean> {
  if (res.status === 429 || res.status === 401 || res.status === 403) return true;
  if (res.status === 400) {
    // Gemini membalas key yang salah dengan 400 + pesan seperti "API key not valid",
    // "API_KEY_INVALID", atau "Invalid Auth key." (key format AQ.).
    const text = await res.clone().text();
    return /API[ _]KEY|Auth key|Authorization header/i.test(text);
  }
  return false;
}

export async function callGemini(path: string, init: RequestInit): Promise<Response> {
  if (KEYS.length === 0) {
    return Response.json({ error: "GEMINI_KEYS kosong" }, { status: 500 });
  }

  let quotaHit = false;

  for (let i = 0; i < KEYS.length; i++) {
    const idx = (current + i) % KEYS.length;
    let res: Response;
    try {
      res = await fetch(`${UPSTREAM}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          // Endpoint OpenAI-compatible Gemini mewajibkan Bearer (tanpanya: 400
          // "Missing or invalid Authorization header"). x-goog-api-key dikirim
          // juga sebagai header resmi Gemini.
          authorization: `Bearer ${KEYS[idx]}`,
          "x-goog-api-key": KEYS[idx],
        },
      });
    } catch (err) {
      // Klien memutus koneksi: berhenti, jangan coba key lain.
      if (init.signal?.aborted) throw err;
      // Gangguan jaringan bukan masalah key, jadi tidak perlu mencoba key lain.
      return Response.json({ error: "gagal menghubungi Gemini" }, { status: 502 });
    }

    // Jatah gratis 0 berlaku untuk semua key tier gratis, jadi tidak perlu mencoba key lain.
    // (Anggapan ini benar selama semua key berasal dari project tanpa billing.)
    if (res.status === 429 && FREE_LIMIT_ZERO.test(await res.clone().text())) {
      await res.body?.cancel();
      return Response.json(
        { error: "model ini tidak tersedia untuk key tier gratis (jatah gratis dari Google = 0), pilih model lain" },
        { status: 403 },
      );
    }

    if (await isKeyProblem(res)) {
      if (res.status === 429) quotaHit = true;
      await res.body?.cancel(); // tutup koneksi yang gagal sebelum mencoba key lain
      continue;
    }

    current = idx; // ingat key yang berhasil
    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-cache",
      },
    });
  }

  // Bedakan "kuota habis" (tunggu reset) dari "semua key salah" (perbaiki GEMINI_KEYS).
  return quotaHit
    ? Response.json({ error: "semua key sedang habis kuota" }, { status: 429 })
    : Response.json({ error: "semua key ditolak Gemini, cek isi GEMINI_KEYS" }, { status: 502 });
}
