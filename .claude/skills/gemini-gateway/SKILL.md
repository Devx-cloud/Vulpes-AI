---
name: gemini-gateway
description: Panduan design dan cara kerja aplikasi Gemini Gateway, yaitu gateway Next.js yang menggabungkan banyak API key Gemini menjadi satu endpoint kompatibel OpenAI, plus UI chat "Vulpes" (AI berkarakter rubah merah) dengan layar token. Pakai skill ini setiap kali bekerja di project ini, terutama saat mengubah tampilan, warna, layout, atau komponen UI; menambah fitur chat; mengubah rotasi key, autentikasi token, streaming, atau route API; men-debug error 401/403/429/502 atau model yang ditolak; mengecek atau memperbarui daftar model yang bisa dipakai; mengatur .env atau Vercel; atau menjelaskan alur aplikasi. Pakai meskipun pengguna tidak menyebut "skill", "design", atau "gateway".
---

# Gemini Gateway

Aplikasi Next.js (App Router, TypeScript) dengan dua bagian:

1. **Gateway API** (`/api/v1/*`): satu URL dan satu token (`GATEWAY_TOKEN`) di depan banyak key Gemini (`GEMINI_KEYS`). Key yang habis kuota atau ditolak dilewati otomatis.
2. **UI chat "Vulpes"** (`/`): AI berkarakter rubah merah (nama dari *Vulpes vulpes*), bukan klon Gemini. Pengguna wajib memasukkan token sebelum bisa chat.

Server tidak punya database dan tidak menyimpan chat. Riwayat chat UI hanya ada di `localStorage` browser.

## Referensi yang perlu dibaca

- Mengubah tampilan, warna, layout, komponen, atau teks UI: baca `references/design.md`.
- Mengubah gateway, route, autentikasi, streaming, penyimpanan, atau men-debug error: baca `references/architecture.md`.
- Fitur yang menyentuh UI dan API sekaligus: baca keduanya.

## Peta file

| File | Isi |
|---|---|
| `lib/gateway.ts` | Server: baca `GEMINI_KEYS`, `checkAuth`, `isKeyProblem`, `callGemini` (rotasi key) |
| `app/api/v1/chat/completions/route.ts` | POST chat, `maxDuration = 300`, meneruskan `req.signal` |
| `app/api/v1/models/route.ts` | GET daftar model |
| `app/api/verify/route.ts` | Cek token tanpa memanggil Gemini, membalas `{ ok, keys }` |
| `lib/chat.ts` | Browser: tipe `Message`/`Conversation`, `verifyToken`, `fetchModels`, `streamChat` (parser SSE), pesan error |
| `lib/storage.ts` | Browser: token, riwayat, model, flag di storage |
| `lib/ui.ts` | `cls()`, `greeting()`, `dateGroup()`, dan hook `useDismiss()` untuk popover |
| `lib/brand.ts` | Nama aplikasi (`APP_NAME = "Vulpes"`), tagline, `displayModelName`/`displayModelId` (nama model versi Vulpes), dan `PERSONA` (instruksi sistem chat UI); ganti nama cukup di sini |
| `components/ChatApp.tsx` | Akar UI: state `loading` → `locked` (layar token) → `ready` |
| `components/Workspace.tsx` | State chat: kirim, streaming, stop, ulangi, hapus; layout utama |
| `components/TokenGate.tsx`, `Sidebar.tsx`, `Composer.tsx`, `ModelPicker.tsx`, `MessageView.tsx`, `Markdown.tsx`, `CopyButton.tsx` | Komponen UI (`ModelPicker` = dropdown model yang posisinya menyesuaikan ruang layar) |
| `components/ApiGuide.tsx` | Panduan "Cara pakai API" (`<dialog>`): base URL, token, contoh kode, daftar id model asli, endpoint, kode status. Dibuka dari tombol `</>` di sidebar |
| `components/FoxMark.tsx`, `FoxTrail.tsx`, `app/icon.svg` | Logo kepala rubah, jejak kaki rubah (latar dan indikator berpikir), favicon |
| `app/globals.css` | Seluruh styling; token warna di `:root` |
| `scripts/check-keys.mjs` | `npm run check-keys`: cek validitas tiap key |
| `.claude/skills/gemini-gateway/scripts/screenshot.mjs` | Screenshot UI lewat Chrome/Edge headless |
| `.claude/skills/gemini-gateway/scripts/test-models.mjs` | Uji model chat mana yang bisa dipakai key gratis; menyarankan isi `UNAVAILABLE` |

## Prinsip yang dijaga

- **Rahasia tetap di server.** Key dan token hanya ada di `.env` (lokal) atau Environment Variables Vercel; `.gitignore` mengabaikan `.env*`. Jangan memakai prefix `NEXT_PUBLIC_`, jangan `console.log` key, dan jangan menulis key asli ke kode, README, atau skill ini. URL gateway bersifat publik dan repo akan di-push ke GitHub, jadi satu kebocoran berarti key harus dibuat ulang.
- **Tanpa database.** Satu-satunya state server adalah indeks `current` di memori. Fitur yang butuh state bersama (statistik kuota, riwayat lintas perangkat, multi-user) berarti menambah penyimpanan seperti Redis/KV. Itu keputusan arsitektur, jadi tanyakan pengguna dulu.
- **Tetap kompatibel OpenAI.** Route meneruskan body apa adanya ke `https://generativelanguage.googleapis.com/v1beta/openai`, sehingga OpenAI SDK, n8n, dan LangChain cukup mengganti base URL. Jangan mengubah bentuk request atau respons di route `/api/v1/*`.
- **Key dikirim lewat dua header:** `Authorization: Bearer <key>` dan `x-goog-api-key`. Endpoint OpenAI-compatible Google menolak request tanpa Bearer (400 "Missing or invalid Authorization header"), termasuk untuk key format baru `AQ.`.
- **Hanya masalah key yang memicu rotasi:** status 429/401/403, atau 400 yang teksnya cocok `/API[ _]KEY|Auth key|Authorization header/i`. Error 500/503 (model sibuk) dan 400 lain (request salah) diteruskan ke klien, karena mengganti key tidak akan memperbaikinya.
- **Pengecualian 429 `limit: 0`:** model khusus akun berbayar dibalas Google dengan 429 berisi jatah gratis `limit: 0`. Gateway langsung membalas 403 "model ini tidak tersedia untuk key tier gratis…" tanpa mencoba key lain (`FREE_LIMIT_ZERO` di `lib/gateway.ts`), karena semua key gratis akan mendapat jawaban yang sama. Tanpa ini, gateway membuang 7 request lalu salah melapor "semua key sedang habis kuota". Anggapan ini benar selama semua key berasal dari project tanpa billing.
- **Setiap route API memanggil `checkAuth` lebih dulu.** Jika `GATEWAY_TOKEN` kosong, semua request ditolak 500 agar gateway tidak pernah terbuka tanpa sengaja.
- **Identitas visual adalah Vulpes, AI rubah merah.** Ini pilihan pengguna: tema merah dengan karakter rubah, bernama Vulpes. Identitas "Gapura" (gerbang bata) sudah ditolak, begitu juga nama "Rubi". Jangan memakai logo, ikon bintang, atau aset merek Google/Gemini, dan jangan mengembalikan tampilan menjadi klon Gemini. Di UI, model juga tampil sebagai Vulpes (misalnya *Vulpes 3.8 Flash*), dan AI memperkenalkan diri sebagai Vulpes lewat `PERSONA`. Id asli `gemini-…` tetap dipakai untuk request, API, dan README.
- **UI berbahasa Indonesia, hanya tema gelap, dan semua warna lewat variabel CSS di `:root`.** Font: Fraunces (judul), Plus Jakarta Sans (UI), JetBrains Mono (label teknis/kode).
- **Tidak ada tombol yang tidak berfungsi.** Jangan menambah tombol untuk fitur yang belum ada (upload file, dan lainnya).

## Alur kerja saat mengubah project

1. Baca file yang akan diubah dan referensi yang relevan.
2. Ubah kode mengikuti gaya sekitar: komentar singkat berbahasa Indonesia, tanpa library state atau CSS tambahan (cukup React state dan `globals.css`).
3. Verifikasi:
   - `npm run build` harus lolos, karena ini juga menjalankan cek tipe.
   - `npm run check-keys` jika menyentuh key atau header.
   - API: jalankan `npx next start -p 3123` di background, lalu tes dengan curl (contoh di `references/architecture.md`).
   - UI: `node .claude/skills/gemini-gateway/scripts/screenshot.mjs --url http://localhost:3123`, lalu buka PNG hasilnya dengan Read. Tambah `--prompt "..."` untuk memotret jawaban (memakai 1 request kuota).
4. Matikan server tes setelah selesai. Untuk tes otomatis pakai `next start`, jangan `next dev`. Selama `next dev` hidup, Next 16 mengunci folder lewat `.next/dev/lock`, sehingga `npm run dev` milik pengguna ditolak dengan "Another next dev server is already running". Mematikan proses pemilik port saja tidak cukup. Jika terpaksa memakai `next dev`, matikan seluruh pohon prosesnya (`taskkill /PID <pid> /T /F`).
5. Perbarui `README.md` jika endpoint, env var, atau perilaku berubah.

## Fakta Gemini API (dicek Oktober 2026)

- Key AI Studio format baru berawalan `AQ.` dan diterima lewat Bearer.
- Tidak semua model di `/models` bisa dipakai key gratis. Seri 2.5 dibalas 404 "no longer available to new users"; `gemini-4-argon`, `gemini-3.1-pro-preview`, `gemini-pro-latest`, dan model Omni dibalas 429 `limit: 0`. Model-model ini disembunyikan dari menu lewat `UNAVAILABLE` di `lib/chat.ts`. Untuk memperbarui daftar, jalankan `node .claude/skills/gemini-gateway/scripts/test-models.mjs` (1 request per model) dan salin daftar yang disarankan.
- Default UI adalah `gemini-3.8-flash` (`DEFAULT_MODEL` di `lib/chat.ts`). Model tersimpan yang tidak ada lagi di daftar otomatis kembali ke default (`pickModel`).
- Gemma 4 menulis proses berpikirnya di awal jawaban: `<thought>…</thought>jawaban`. UI membuangnya lewat `stripThought` (saat tampil dan saat jawaban selesai disimpan); klien API tetap menerima teks mentah.
- Id dari `/openai/models` berawalan `models/`. UI membuang prefix itu, dan chat menerima id tanpa prefix.
- Error Gemini kadang berbentuk array: `[{"error": {...}}]`. `messageFrom()` di `lib/chat.ts` menangani bentuk objek dan array.
- Respons Gemini 3 menyertakan `extra_content.google.thought_signature`. UI mengabaikannya, dan itu aman untuk chat teks biasa.
- Kuota gratis dihitung per Google Cloud project. Limit harian reset tengah malam waktu Pacific (sekitar 15.00–16.00 WITA).

## Troubleshooting cepat

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| UI: "Token salah atau sudah diganti" | Token yang diketik berbeda dengan `GATEWAY_TOKEN` | Samakan; setelah mengubah env di Vercel, redeploy |
| 500 "GATEWAY_TOKEN belum diatur" | Env var kosong | Isi `.env` atau Vercel, lalu restart/redeploy |
| 429 "semua key sedang habis kuota" | Semua key kena limit | Tunggu reset, atau tambah key dari project Google Cloud lain |
| 502 "semua key ditolak Gemini" | Key salah ketik (`I` vs `l`) atau dicabut | `npm run check-keys`, salin ulang key dari AI Studio |
| 403 "model ini tidak tersedia untuk key tier gratis" | Model khusus akun berbayar (jatah gratis 0) | Pilih model lain; jika model ini muncul di menu, tambahkan id-nya ke `UNAVAILABLE` |
| Kotak error 404 "model ... no longer available" | Model sudah dipensiunkan untuk pengguna baru | Pilih model lain; tambahkan id-nya ke `UNAVAILABLE` (atau jalankan `scripts/test-models.mjs`) |
| Model 500/503 terus-menerus (misalnya `gemma-4-31b-it`) | Server Google untuk model itu sedang bermasalah | Pakai model lain; biasanya pulih sendiri |
| Perubahan `.env` tidak berlaku | Env dibaca saat server start | Restart `next start`; di Vercel, redeploy |
| `npm run dev`: "Another next dev server is already running" | Masih ada `next dev` lain di folder ini (sering kali server tes yang belum mati) | Jalankan `taskkill /PID <pid> /F` sesuai pesan, lalu `npm run dev` lagi |
| Browser: `ERR_CONNECTION_REFUSED` | Server tidak jalan, atau berjalan di port lain | Jalankan `npm run dev`, buka alamat di baris `Local:` |
| Membuka `/api/v1` di browser: 404 atau "unauthorized" | Itu base URL API untuk program, bukan halaman | Buka `/` untuk UI chat |
