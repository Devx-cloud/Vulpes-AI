import { callGemini, checkAuth } from "@/lib/gateway";

// Banyak klien OpenAI (termasuk tes kredensial n8n) memanggil GET /models.
export async function GET(req: Request) {
  const denied = checkAuth(req);
  if (denied) return denied;

  return callGemini("/models", { method: "GET", signal: req.signal });
}
