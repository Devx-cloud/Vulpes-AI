import { callGemini, checkAuth } from "@/lib/gateway";

// Batas maksimum paket Hobby Vercel (Fluid compute) adalah 300 detik.
export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = checkAuth(req);
  if (denied) return denied;

  return callGemini("/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
    signal: req.signal, // hentikan panggilan ke Gemini jika klien memutus koneksi
  });
}
