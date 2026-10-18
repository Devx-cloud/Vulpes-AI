import { checkAuth, keyCount } from "@/lib/gateway";

// Cek token tanpa memanggil Gemini (tidak memakai kuota). Dipakai layar token di UI.
export async function GET(req: Request) {
  const denied = checkAuth(req);
  if (denied) return denied;

  return Response.json({ ok: true, keys: keyCount() });
}
