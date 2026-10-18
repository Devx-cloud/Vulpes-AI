# Arsitektur dan cara kerja

## Daftar isi

1. Gambaran besar
2. Server: `lib/gateway.ts`
3. Route API
4. UI: siklus hidup dan state
5. Streaming
6. Penyimpanan browser
7. Penanganan error
8. Pola menambah fitur
9. Cara menguji

## 1. Gambaran besar

```
Browser (UI) ──Bearer GATEWAY_TOKEN──► /api/verify ............ cek token saja, tanpa Gemini
       │
       └──────Bearer GATEWAY_TOKEN──► /api/v1/models ──────────┐
                                      /api/v1/chat/completions ┼─► callGemini() ─► Gemini API
Klien API / n8n ──Bearer GATEWAY_TOKEN─────────────────────────┘     (key ke-i, lalu i+1, ...)
```

Setiap request API melewati `checkAuth` lalu `callGemini`. UI dan klien eksternal memakai endpoint dan token yang sama; UI hanya klien biasa yang kebetulan disajikan dari domain yang sama.

## 2. Server: `lib/gateway.ts`

- **`KEYS`**: dibaca sekali saat modul dimuat dari `GEMINI_KEYS` (dipisah koma, di-trim, nilai kosong dibuang). Perubahan env baru berlaku setelah restart atau redeploy.
- **`current`**: indeks key terakhir yang berhasil. Disimpan di memori per instance, kembali ke 0 saat cold start. Instance berbeda bisa punya nilai berbeda; hasil akhir tetap benar, hanya kadang mencoba key yang sudah habis dulu.
- **`keyCount()`**: jumlah key, dipakai `/api/verify`.
- **`checkAuth(req)`**: membandingkan header `Authorization` dengan `Bearer ${GATEWAY_TOKEN}` memakai `timingSafeEqual` agar token tidak bisa ditebak lewat waktu respons. Panjang dicek dulu karena `timingSafeEqual` melempar error jika panjang berbeda. Mengembalikan `Response` 401/500 atau `null` jika lolos.
- **`isKeyProblem(res)`**: `true` untuk 429/401/403, atau 400 dengan teks yang cocok `/API[ _]KEY|Auth key|Authorization header/i`. Body dibaca lewat `res.clone()` supaya body asli tetap bisa diteruskan.
- **`callGemini(path, init)`**: loop mulai dari `current`:
  1. `fetch` ke `UPSTREAM + path` dengan header `authorization: Bearer <key>` dan `x-goog-api-key: <key>`.
  2. Jika `fetch` melempar: kalau `init.signal` sudah abort (klien memutus koneksi), lempar ulang. Selain itu kembalikan 502 "gagal menghubungi Gemini", karena gangguan jaringan bukan masalah key.
  3. Jika 429 dan body cocok `FREE_LIMIT_ZERO` (`/free_tier\w*, limit: 0\b/`): model khusus akun berbayar. Langsung balas 403 "model ini tidak tersedia untuk key tier gratis…" tanpa mencoba key lain, karena semua key gratis akan dibalas sama. Anggapannya semua key berasal dari project tanpa billing; kalau suatu saat key berbayar dicampur, langkah ini perlu diubah.
  4. Jika masalah key: tandai `quotaHit` untuk 429, `res.body.cancel()`, lanjut ke key berikutnya.
  5. Selain itu: simpan `current = idx`, lalu teruskan body (termasuk stream) dengan `content-type` asli dan `cache-control: no-cache`. Status non-key (200, 400 request salah, 404 model, 500/503) diteruskan apa adanya beserta body error Gemini.
  6. Semua key gagal: 429 jika ada yang kena kuota, selain itu 502 (semua ditolak).

## 3. Route API

| Route | Method | Catatan |
|---|---|---|
| `app/api/v1/chat/completions/route.ts` | POST | `maxDuration = 300` (batas Vercel Hobby). Body diteruskan mentah (`await req.text()`). `signal: req.signal` agar abort dari klien ikut menghentikan panggilan ke Gemini. |
| `app/api/v1/models/route.ts` | GET | Banyak klien OpenAI (tes kredensial n8n) memanggil ini. |
| `app/api/verify/route.ts` | GET | `{ ok: true, keys }`. Tidak memanggil Gemini, jadi tidak memakai kuota. Ada di luar `/v1` karena bukan bagian API OpenAI. |

## 4. UI: siklus hidup dan state

### `ChatApp` (state machine)

```
loading ── tidak ada token tersimpan ────────────────► locked
   ├──── token ada, /api/verify 200 ─────────────────► ready (Workspace)
   └──── verify gagal ──────────────────────────────► locked + notice
                                                      (token dibuang hanya jika 401;
                                                       gangguan lain mengisi ulang form)
locked ── TokenGate submit, verify 200 ──────────────► ready
          (saveToken: localStorage jika "Ingat di perangkat ini", selain itu sessionStorage)
ready ─── tombol Keluar, atau 401 dari API mana pun ──► locked (clearToken)
```

Render pertama selalu splash, karena server tidak tahu token di storage browser. Ini mencegah hydration mismatch. Karena `Workspace` hanya dirender setelah mount, komponen itu boleh membaca `localStorage` langsung di initializer `useState`.

### `Workspace`

| State | Arti |
|---|---|
| `chats` | Semua `Conversation` (dimuat dari storage) |
| `activeId` | Percakapan yang dibuka; `null` berarti layar sambutan |
| `models`, `modelsError` | Hasil `fetchModels` untuk menu model |
| `model` | Model terpilih (disimpan) |
| `streamingId` | Id pesan assistant yang sedang streaming; `null` jika diam |
| `drawerOpen` | Sidebar mobile terbuka |
| `guideOpen` | Panduan API (`ApiGuide`) terbuka. Base URL diambil dari `window.location.origin + "/api/v1"`, jadi otomatis benar di localhost maupun Vercel. Contoh kode memakai `TOKEN_KAMU` sampai pengguna menekan ikon mata, dan model di contoh kode = model yang sedang dipilih (id asli). |
| `collapsed` | Sidebar desktop diciutkan (disimpan) |
| `abortRef`, `threadRef`, `stickRef` | Controller abort aktif, elemen scroll, dan apakah auto-scroll aktif |

Alur kirim pesan:

1. `send(text)`: jika `activeId` kosong, buat `Conversation` baru dengan judul 48 karakter pertama (`titleFrom`). Pesan user ditambahkan.
2. `respond(chatId, history)`: menambah pesan assistant kosong (dengan `model` yang dipakai), mengisi `streamingId`, membuat `AbortController`, lalu memanggil `streamChat`. Pesan pertama selalu `PERSONA` dari `lib/brand.ts` dengan role `system`, supaya AI memperkenalkan diri sebagai Vulpes. Gemini dan Gemma 4 sama-sama menerima role `system`. Pesan error atau kosong dibuang dari konteks. Setiap `onDelta` menambah teks ke pesan itu.
3. Akhir: konten dibersihkan dengan `stripThought` (blok `<thought>` Gemma dibuang). Jika setelah itu kosong, berarti error "tidak mengirim jawaban". Abort berarti `stopped: true` (teks parsial tetap ada). `AuthError` memanggil `onLock`. Error lain disimpan di `message.error`.

- Daftar model dimuat sekali saat `Workspace` mount. `pickModel` mengganti model tersimpan yang tidak ada di daftar (disembunyikan atau dihapus Google) dengan `DEFAULT_MODEL`, atau model pertama jika default juga tidak ada.

- `regenerate()`: buang jawaban terakhir, lalu panggil `respond` lagi dengan model yang sedang dipilih.
- Stop: `abortRef.current.abort()` membatalkan fetch browser, dan server meneruskan abort ke Gemini lewat `req.signal`.
- Auto-scroll: `stickRef` bernilai `true` selama jarak ke bawah < 80px, jadi pengguna yang menggulir ke atas tidak ditarik paksa ke bawah.
- `MessageView` dibungkus `memo`. Saat streaming, hanya pesan yang berubah yang dirender ulang, karena objek pesan lain tidak berganti identitas.

## 5. Streaming (`streamChat` di `lib/chat.ts`)

- Request: `POST /api/v1/chat/completions` dengan `{ model, messages, stream: true }`.
- Respons: Server-Sent Events, satu event per baris `data: {json}`, diakhiri `data: [DONE]`.
- Parser: tampung teks di `buffer`, pecah per `\n`, simpan potongan terakhir yang belum lengkap, lalu ambil `choices[0].delta.content`. Objek `error` di tengah stream dilempar sebagai error.
- Status non-2xx dibaca dengan `readError()` sebelum stream dimulai.
- Gemma menulis `<thought>…</thought>` di awal jawaban, dan tag itu bisa terpotong antar potongan stream. Karena itu selama streaming teks mentah disimpan apa adanya, sedangkan `MessageView` menampilkan `stripThought(content)`. Blok yang belum ditutup ikut disembunyikan, sehingga yang terlihat hanya "Sedang berpikir…" sampai jawabannya mulai.

## 6. Penyimpanan browser (`lib/storage.ts`)

| Key | Storage | Isi |
|---|---|---|
| `gw:token` | local (jika "Ingat") atau session | Token gateway |
| `gw:chats` | local | `Conversation[]`, 50 terbaru, ditulis dengan jeda 300 ms |
| `gw:model` | local | Id model terakhir |
| `gw:sidebar-collapsed` | local | `"1"` jika sidebar diciutkan |

Semua akses dibungkus `try/catch`, karena storage bisa penuh atau diblokir (mode privat).

```ts
interface Message { id: string; role: "user" | "assistant"; content: string; error?: string; stopped?: boolean }
interface Conversation { id: string; title: string; messages: Message[]; updatedAt: number }
```

## 7. Penanganan error

| Sumber | Status | Yang terjadi di UI |
|---|---|---|
| Gateway `checkAuth` | 401 | `AuthError`: kembali ke layar token dengan pesan |
| Gateway, semua key kena kuota | 429 | Pesan kuota beserta jam reset |
| Gateway, model khusus berbayar (429 `limit: 0` dari Google) | 403 | "Model ini tidak tersedia untuk key tier gratis…" |
| Gateway, semua key ditolak / env kosong | 502 / 500 | Pesan dari gateway |
| Gemini (model tidak ada, request salah) | 404 / 400 | `error.message` dari Gemini (bentuk objek atau array) |
| Jaringan putus | `TypeError` | "Tidak bisa terhubung ke gateway" |
| `fetchModels` gagal | apa saja | Pesan di menu model; chat tetap jalan dengan model tersimpan |

## 8. Pola menambah fitur

- **Endpoint OpenAI-compatible baru** (misalnya embeddings): buat `app/api/v1/embeddings/route.ts` meniru route chat (`checkAuth`, lalu `callGemini("/embeddings", {...})`). Rotasi key langsung ikut bekerja.
- **Endpoint internal** (bukan API OpenAI): taruh di luar `/v1` seperti `/api/verify`, dan tetap panggil `checkAuth`.
- **Fitur chat baru**: state dan logika di `Workspace`, tampilan di komponen terpisah, teks berbahasa Indonesia, dan styling mengikuti `design.md`.
- **Model**: default di `DEFAULT_MODEL`. Filter model non-chat ada di regex `NON_CHAT`, model yang tidak bisa dipakai key gratis ada di `UNAVAILABLE`, dan urutan menu diatur fungsi `rank()` (versi terbaru di atas). Untuk memperbarui `UNAVAILABLE`, jalankan `node .claude/skills/gemini-gateway/scripts/test-models.mjs`. Jika `NON_CHAT` diubah, samakan juga regex di skrip itu. Nama yang terlihat di UI diubah ke merek Vulpes hanya saat ditampilkan (`displayModelName`/`displayModelId` di `lib/brand.ts`). Yang disimpan dan dikirim ke gateway tetap id asli, jadi jangan mengganti id di `fetchModels` atau `streamChat`.
- **Perlu persetujuan pengguna dulu**: database/Redis, multi-user, dan upload gambar/file. Upload perlu kompresi di browser, karena batas body fungsi Vercel 4.5 MB dan `localStorage` sekitar 5 MB.

## 9. Cara menguji

```bash
npm run build
npm run check-keys
npx next start -p 3123            # jalankan di background

T=$(grep GATEWAY_TOKEN .env | cut -d= -f2)
curl -s -w ' [%{http_code}]\n' localhost:3123/api/verify                          # 401
curl -s -H "Authorization: Bearer $T" localhost:3123/api/verify                     # {"ok":true,"keys":N}
curl -s -H "Authorization: Bearer $T" -H "content-type: application/json" \
  localhost:3123/api/v1/chat/completions \
  -d '{"model":"gemini-3.8-flash","messages":[{"role":"user","content":"halo"}]}'

# Uji rotasi: key palsu di depan (env var dari shell mengalahkan .env)
GEMINI_KEYS="AQ.salah,<key-valid>" npx next start -p 3124
```

Tes UI: `node .claude/skills/gemini-gateway/scripts/screenshot.mjs --url http://localhost:3123 [--prompt "halo"]`.

Untuk tes otomatis pakai `next start`, bukan `next dev`. `next dev` memegang kunci `.next/dev/lock` (lewat file lock native OS) selama prosesnya hidup. Server tes `next dev` yang tertinggal membuat `npm run dev` milik pengguna gagal dengan "Another next dev server is already running", dan mematikan proses pemilik port saja tidak cukup untuk melepas kunci itu. `next start` tidak memakai kunci ini.

Mematikan server tes di Windows (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 3123 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
