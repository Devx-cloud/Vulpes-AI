# Vulpes: Gemini Key Gateway

Menggabungkan banyak API key Gemini menjadi **satu endpoint kompatibel OpenAI**, plus **UI chat "Vulpes"**, AI dengan karakter rubah merah. Jika satu key habis kuota (429) atau ditolak (400/401/403), gateway otomatis mencoba key berikutnya.

```
Browser (UI chat) ─┐
Klien API / n8n ───┼─► Gateway (Next.js / Vercel) ─► Gemini API (key1 ... keyN)
                   │   1 URL + 1 token
```

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/` | UI chat (wajib memasukkan token dulu) |
| POST | `/api/v1/chat/completions` | Chat, mendukung `stream: true` |
| GET | `/api/v1/models` | Daftar model (dipakai tes kredensial n8n dll.) |
| GET | `/api/verify` | Cek token tanpa memanggil Gemini, membalas `{ ok, keys }` |

Semua endpoint API wajib memakai header `Authorization: Bearer <GATEWAY_TOKEN>`.

Hasil yang mungkin:
- `401`: token gateway salah.
- `403`: model khusus akun berbayar (jatah gratis dari Google = 0). Pilih model lain.
- `429`: semua key sedang habis kuota. Tunggu reset.
- `502`: semua key ditolak. Cek isi `GEMINI_KEYS`.

## UI chat

Buka `/` di browser:

1. **Layar token**: masukkan `GATEWAY_TOKEN`. Token dicek ke `/api/verify` (tidak memakai kuota). Centang "Ingat di perangkat ini" agar tidak perlu login ulang.
2. **Chat**: sidebar riwayat (dikelompokkan per tanggal, bisa dicari), pilihan model, saran pertanyaan, dan input suara di Chrome/Edge. Jawaban tampil langsung (streaming) dengan format Markdown, mencantumkan model yang menjawab, dan bisa dihentikan, disalin, atau diulang.
3. **Cara pakai API**: tombol `</>` di sidebar membuka panduan memakai API gabungan dari project lain. Isinya base URL (otomatis sesuai alamat aplikasi), token (tersamar, bisa disalin), contoh kode siap salin (cURL, Python, JavaScript, n8n/LangChain), daftar id model, endpoint, dan arti kode status.
4. **Keluar**: ikon Keluar di kanan atas (atau gear → Keluar & ganti token) menghapus token dari browser.

Nama "Vulpes" berasal dari *Vulpes vulpes*, nama ilmiah rubah merah. Untuk memakai nama lain, ganti `APP_NAME` di `lib/brand.ts`.

Di UI, semua model tampil dengan nama Vulpes, misalnya `gemini-3.8-flash` tampil sebagai **Vulpes 3.8 Flash**. AI-nya juga memperkenalkan diri sebagai Vulpes lewat instruksi sistem (`PERSONA` di `lib/brand.ts`), dan bila ditanya tetap jujur bahwa ia berjalan di atas Gemini. Untuk API dari project lain, tetap pakai id asli `gemini-…`.

Riwayat chat disimpan di `localStorage` browser masing-masing (maksimal 50 percakapan). Server tetap tanpa database.

## Menjalankan lokal

```bash
npm install
cp .env.example .env    # lalu isi GEMINI_KEYS dan GATEWAY_TOKEN
npm run check-keys      # cek setiap key valid
npm run dev             # UI: http://localhost:3000, API: http://localhost:3000/api/v1
```

Buat token dengan `openssl rand -hex 32` atau
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

`.env` **tidak ikut ter-push** ke GitHub karena `.gitignore` mengabaikan semua file `.env*` (kecuali `.env.example` yang tidak berisi rahasia).

## Deploy ke Vercel

1. Push repo ke GitHub, lalu import di Vercel.
2. **Settings → Environment Variables** (isi sama dengan `.env`):
   - `GEMINI_KEYS`: key dipisah koma, tanpa tanda kutip. Tandai **Sensitive**.
   - `GATEWAY_TOKEN`: token rahasia.
3. Redeploy setiap kali env var berubah.

Menambah key: tambahkan `,key-baru` di ujung `GEMINI_KEYS`, lalu redeploy.

## Pemakaian dari project lain

```python
from openai import OpenAI

client = OpenAI(base_url="https://nama-app.vercel.app/api/v1", api_key="TOKEN_GATEWAY")
resp = client.chat.completions.create(
    model="gemini-3.8-flash",
    messages=[{"role": "user", "content": "halo"}],
)
print(resp.choices[0].message.content)
```

```bash
curl https://nama-app.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer TOKEN_GATEWAY" -H "Content-Type: application/json" \
  -d '{"model":"gemini-3.8-flash","messages":[{"role":"user","content":"halo"}]}'
```

n8n / LangChain: pilih kredensial OpenAI, ganti base URL ke `https://nama-app.vercel.app/api/v1`, API key = `GATEWAY_TOKEN`.

## Struktur

```
lib/gateway.ts            rotasi key + cek token (server)
lib/chat.ts               tipe data + pemanggil API dan parser streaming (browser)
lib/storage.ts            token, riwayat, model di localStorage (browser)
lib/brand.ts              nama aplikasi dan tagline
app/api/...               route API
app/page.tsx, components/ UI chat
app/globals.css           tema (token warna di :root)
.claude/skills/gemini-gateway/  skill: panduan design + cara kerja untuk Claude Code
```

## Catatan (dicek Oktober 2026)

- Endpoint OpenAI-compatible Gemini **wajib** memakai `Authorization: Bearer`; key format `AQ.` diterima dengan cara ini. Gateway mengirim `Bearer` dan `x-goog-api-key` sekaligus.
- Tidak semua model di `/models` bisa dipakai key gratis. Seri 2.5 ditolak untuk pengguna baru (404), sedangkan `gemini-4-argon`, model Pro, dan Omni jatah gratisnya 0. Model-model itu disembunyikan dari menu UI (daftar `UNAVAILABLE` di `lib/chat.ts`). Cek ulang kapan saja dengan `node .claude/skills/gemini-gateway/scripts/test-models.mjs`.
- Jawaban Gemma diawali proses berpikir dalam blok `<thought>…</thought>`. UI menyembunyikannya; klien API tetap menerima teks mentah.
- Key salah bisa dibalas `"Invalid Auth key."`, `"API key not valid"`, atau `API_KEY_INVALID`; semuanya memicu pindah key.
- Kuota gratis dihitung **per Google Cloud project**. Key dari project yang sama berbagi kuota.
- Menggabungkan key menambah total kuota (RPM/RPD/TPM), bukan batas konteks atau output per request.
- Data di tier gratis dapat dipakai Google. Jangan kirim data sensitif.

## Keterbatasan

- Indeks key aktif hanya disimpan di memori; hilang saat instance Vercel mati dan bisa berbeda antar instance. Hasil tetap benar, hanya kadang mencoba key yang sudah habis dulu.
- Error 500/503 dari Gemini tidak memicu pindah key (masalah model, bukan key). Klien sebaiknya retry sendiri.
- Fungsi Vercel Hobby maksimal 300 detik. Pakai `stream: true` untuk jawaban panjang (UI selalu streaming).
- Riwayat chat UI hanya ada di browser tempat chat dibuat, tidak tersinkron antar perangkat.
