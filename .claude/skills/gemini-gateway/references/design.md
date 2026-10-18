# Design system: Vulpes

## Daftar isi

1. Konsep
2. Token warna
3. Tipografi
4. Bentuk dan ukuran
5. Motif khas
6. Anatomi layar
7. Komponen dan class
8. State dan animasi
9. Teks UI
10. Aksesibilitas
11. Responsif
12. Checklist perubahan UI

## 1. Konsep

- **Karakter:** *Vulpes*, AI berkarakter rubah merah. Namanya diambil dari *Vulpes vulpes*, nama ilmiah rubah merah. Kesannya cerdik, gesit, dan ramah. Nama dan tagline ada di `lib/brand.ts`.
- **Asal keputusan:** pengguna meminta tema **merah** dengan karakter **rubah** (pilihan lainnya gagak), lalu memilih nama "Vulpes". Identitas "Gapura" (gerbang bata) dan nama "Rubi" sudah ditolak; jangan dipakai lagi.
- **Suasana:** rubah merah di malam yang gelap. Latarnya hitam netral, aksennya **merah sejati (crimson, hue ±0°)**, krem untuk pipi dan ujung ekor, dan amber hanya untuk mata rubah di logo.
- **Merah, bukan oranye:** pengguna menolak versi sebelumnya karena terlihat oranye. Penyebabnya merah-oranye `#c93c1c`/`#f47a4f` dan latar bernuansa cokelat. Jangan memakai warna aksen dengan hue 10–40° (oranye/terakota), dan jangan memberi latar nuansa cokelat (R > G > B), karena keduanya membuat merah tampak oranye.
- **Pembeda dari Gemini/ChatGPT (jangan dikembalikan ke gaya klon):**
  1. Nama "Vulpes" selalu miring, mengikuti cara penulisan nama ilmiah, dengan serif hangat Fraunces.
  2. Sudut 10–18px, bukan serba-pil.
  3. Label teknis dalam huruf mono kapital berspasi lebar.
  4. Motif rubah: logo kepala rubah, jejak kaki di latar, indikator berpikir berupa jejak kaki, dan deretan key berbentuk ekor.
  5. Jawaban AI tanpa avatar bulat: ada baris kepala berisi logo, nama, dan model yang menjawab.
- **Aturan merek:** jangan memakai logo, ikon bintang, atau aset merek Google/Gemini. Atas permintaan pengguna, **semua model di UI tampil dengan nama Vulpes**: `displayModelName`/`displayModelId` di `lib/brand.ts` mengubah `gemini-3.8-flash` menjadi *Vulpes 3.8 Flash* / `vulpes-3.8-flash`. Chat UI juga mengirim `PERSONA` sebagai pesan `system` supaya AI memperkenalkan diri sebagai Vulpes. Id asli tetap dipakai untuk request, dan API/README tetap memakai nama Gemini. Persona tetap jujur: bila ditanya teknologinya, Vulpes menyebut model Gemini dari Google.
- **Hanya tema gelap** (`color-scheme: dark`).

## 2. Token warna

Semua didefinisikan di `:root` pada `app/globals.css`. Warna baru ditambahkan sebagai token dulu, baru dipakai.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--bg` | `#121011` | Body, area utama (hitam netral, bukan cokelat) |
| `--bg-sidebar` | `#171415` | Sidebar |
| `--surface` | `#1d1a1b` | Kotak input, kartu |
| `--surface-2` | `#272324` | Balon pengguna, kode inline, chip model, percakapan aktif |
| `--surface-3` | `#322d2e` | Tombol kirim nonaktif, label tag |
| `--menu` | `#1f1b1c` | Popover (menu model, pengaturan) |
| `--line` | `rgba(255,235,235,.08)` | Garis tipis |
| `--line-strong` | `#3a3334` | Garis kotak input, kartu, tombol ghost |
| `--text` | `#f2ecec` | Teks utama |
| `--text-strong` | `#fffafa` | Judul, nama, teks tebal |
| `--text-muted` | `#b5abac` | Teks sekunder, ikon |
| `--text-faint` | `#91888a` | Label, placeholder, catatan (±5,5:1 di `--bg`, ±4,5:1 di `--surface-2`) |
| `--fox` | `#d32f2f` | Merah utama: tombol utama, kirim, penanda aktif, ruas ekor (teks putih ±5:1) |
| `--fox-hover` | `#c62828` | Hover tombol utama (lebih gelap, teks putih ±5,6:1) |
| `--fox-deep` | `#8e1b1b` | Bayangan merah tua |
| `--fox-light` | `#ef5350` | Merah terang di atas latar gelap: kata miring di judul, tautan, fokus, penanda daftar, jejak kaki, titik status, permata chip model (±5,4:1 di `--bg`) |
| `--fox-soft` | `rgba(211,47,47,.18)` | Latar tombol "Percakapan baru", opsi terpilih, tag `default` |
| `--fox-text` | `#ffb8b8` | Teks di atas `--fox-soft` |
| `--cream` | `#f5ebe6` | Pipi rubah di logo, ujung ekor di deretan key |
| `--amber` | `#f2b45a` | **Hanya** mata rubah di logo; aksen lain memakai merah |
| `--dusk` | radial `rgba(211,47,47,.28)` dari bawah tengah | Latar layar token, splash, layar sambutan |
| `--grain` | noise SVG putih netral, alpha ±4% | Tekstur halus pada sidebar, area utama, layar token |

Nilai turunan yang masih ditulis langsung di aturan CSS:
- Logo: bagian dalam telinga `#4a0f0f`, hidung `#1a0b0b`, gradasi wajah `#ef5350 → #b71c1c` (juga di `app/icon.svg`).
- Ruas ekor genap `#a61e1e`.
- Overlay hover `rgba(255,235,235,.05–.07)`, border hover/fokus `rgba(239,83,80,…)`, cincin fokus `rgba(211,47,47,…)`.
- Teks error `#ffd0d0`/`#ff8a8a`.
- Latar blok kode `#0e0c0d`/`#181415`.

Jika dipakai ulang di tempat lain, jadikan token.

## 3. Tipografi

Dimuat lewat `next/font/google` di `app/layout.tsx`:

| Font | Variabel | Peran |
|---|---|---|
| Fraunces (variabel, sumbu `SOFT`, `WONK`, `opsz`, normal + italic) | `--font-display` | Nama Vulpes, judul sambutan, h1/h2 Markdown |
| Plus Jakarta Sans (font buatan Indonesia) | `--font-ui` | Semua teks UI dan isi jawaban |
| JetBrains Mono | `--font-code` | Label kapital, id model, tag, input token, kode |

| Elemen | Ukuran / gaya |
|---|---|
| Nama Vulpes (`.brand-name`, `.topbar-brand`, `.msg-name`, `.gate-title`) | Fraunces **miring** (gaya nama ilmiah); 23px di sidebar, 38px di layar token, 15px di kepala pesan |
| Judul sambutan | `clamp(34px, 4.6vw, 54px)`, 400, `"SOFT" 100`; kata `<em>` miring `--fox-light` dengan `"WONK" 1` |
| Label mono (`.sb-label`, `.eyebrow`, `.menu-head`, `.field-label`, header kode) | 10–11.5px, huruf kapital, `letter-spacing: .1em` |
| Isi jawaban | 15.5px, line-height 1.75 |
| Teks UI umum | 13–15px |

## 4. Bentuk dan ukuran

- **Radius:** kartu token 22px; kotak input 18px; menu 14px; blok kode, kotak error, dan field token 12px; tombol, chip, input sidebar, dan item riwayat 10px (`--radius-sm`); opsi menu 9px; tag 5–6px. Balon pengguna `16px 16px 4px 16px` (ekor di kanan bawah).
- **Tinggi:** topbar 60px; tombol "Percakapan baru" 42px; cari 38px; item riwayat 36px; `.icon-btn` 38px (kecil 30px); `.btn` 36px; `.round-btn` 36px; chip model 34px; chip saran 32px; field token 48px; tombol Masuk 46px.
- **Lebar:** sidebar 284px, atau 68px saat diciutkan; kolom percakapan dan kotak input bawah maksimal 760px; isi layar sambutan maksimal 720px; kartu token maksimal 400px; menu model 340px.

## 5. Motif khas

- **Logo `FoxMark`** (`components/FoxMark.tsx`, viewBox 32×32):
  - Kepala rubah geometris: wajah segitiga terbalik dengan dua telinga runcing (`.fox-mark` + gradasi).
  - Bagian dalam telinga gelap (`.fox-shade`) dan pipi krem (`.fox-cheek`).
  - Mata amber berbentuk almond (`.fox-eye`) dan hidung gelap (`.fox-nose`).
  - Prop `glowing` membuat mata menyala-redup (splash, saat memeriksa token, saat jawaban ditulis).
  - Favicon `app/icon.svg` memakai bentuk yang sama di atas kotak `--bg`.
- **Jejak kaki `FoxTrail`** (`components/FoxTrail.tsx`):
  - 12 jejak kaki (tumit + empat jari) berjalan hampir lurus dari pojok kiri bawah ke arah tengah, dengan sudut langkah 66°.
  - Opasitas naik dari 0,08 ke 0,40, sehingga jejak terbaru yang paling dekat ke konten paling jelas.
  - Ukuran `.trail` `min(600px, 55vw)`, atau 78vw di mobile.
  - Dipakai di layar token (mengarah ke kartu) dan layar sambutan (mengarah ke kotak input).
- **Indikator berpikir:** komponen `Paw` dari `FoxTrail.tsx`. Tiga jejak kaki kecil (`.paws`) muncul bergantian seperti sedang berjalan, dengan teks "Mengendus jawaban…".
- **Ekor rubah:** deretan key di kaki sidebar (`.tail`), satu ruas per key. Ruasnya merah berselang-seling dengan ujung krem, maksimal 12 lalu "+N".
- **Lainnya:** penanda percakapan aktif berupa garis merah 3px di kiri, permata merah menyala di chip model, dan titik merah di eyebrow sambutan.

## 6. Anatomi layar

### Layar token (`.gate`)

```
                     ┌────────────────────────────┐
                     │        [logo rubah]        │
                     │          *Vulpes*          │
                     │  Rubah merah yang cerdik,  │
                     │  ditenagai semua key-mu.   │
                     │ TOKEN AKSES                │
                     │ [🔑 Tempel GATEWAY_TOKEN 👁] │
                     │ ☑ Ingat di perangkat ini   │
                     │ [        Masuk  →        ] │
          ° °        └────────────────────────────┘
      ° °      (jejak kaki dari kiri bawah menuju kartu; cahaya senja di bawah tengah)
  ° °
```

### Layar sambutan (`.main.is-welcome`)

```
┌────────────────────┬────────────────────────────────────────────────────┐
│ [rubah] *Vulpes* ▯ │                                                 ⇥  │
│ [+ Percakapan baru]│                                                    │
│ [</> Cara pakai API]│                                                   │
│ ────────────────── │        ● SELAMAT PAGI · 7 KEY SIAP                 │
│ Riwayat         (5)│            Mau tanya *apa* hari ini?               │
│ [🔍 Cari percakapan]│                                                   │
│ HARI INI           │                                                    │
│ ▌Judul aktif…   🗑 │   ┌──────────────────────────────────────────┐     │
│  Judul lain…       │   │ Tanya Vulpes…                            │     │
│                    │   │ [◆ Vulpes 3.8 Flash ▾]          🎤  [↑]  │     │
│                    │   └──────────────────────────────────────────┘     │
│ ▬▬▬▬▬▬▭ (ekor)     │   [Jelaskan sederhana] [Ringkas teks] [Perbaiki…]  │
│ 7 key tergabung ⚙  │ ° ° ° ° (jejak kaki menuju kotak input)             │
└────────────────────┴────────────────────────────────────────────────────┘
```

Di layar sambutan, topbar desktop hanya berisi tombol Keluar (ikon). Tombol "Chat baru" muncul saat ada percakapan aktif.

### Layar percakapan

```
│ Judul percakapan (abu-abu)                     [+ Chat baru]  ⇥ │
│                                  ┌──────────────────────┐        │
│                                  │ pesan pengguna       │        │
│                                  └──────────────────────┘        │
│ [rubah] *Vulpes*  [vulpes-3.8-flash]                              │
│ Jawaban Markdown selebar kolom, tanpa balon.                     │
│ ┌ JAVASCRIPT ─────────────────────────────────── ⧉ ┐             │
│ │ kode                                              │             │
│ └───────────────────────────────────────────────────┘             │
│ ⧉ ↻          (salin; ulangi hanya untuk jawaban terakhir)         │
│ ┌──────────────────────────────────────────────────┐              │
│ │ Tanya Vulpes…                                     │              │
│ │ [◆ Vulpes 3.8 Flash ▾]                  🎤  [↑/■] │              │
│ └──────────────────────────────────────────────────┘              │
│        Jawaban AI bisa keliru, jadi periksa kembali. …            │
```

Tombol kirim (`[↑]`) berwarna merah saat ada teks, abu-abu nonaktif saat kosong, dan berubah menjadi tombol stop (`■`, latar terang) saat streaming. Mic hanya muncul jika browser mendukung Web Speech API.

## 7. Komponen dan class

| Komponen | Class utama | Catatan |
|---|---|---|
| `TokenGate` | `.gate`, `.gate-card`, `.gate-logo`, `.gate-title`, `.gate-tagline`, `.field-label`, `.field`, `.check`, `.gate-error`, `.gate-hint` | Kartu semi-transparan dengan `backdrop-filter` di atas `FoxTrail`; tagline `text-wrap: balance` |
| `Sidebar` | `.sidebar` (`.is-collapsed`, `.is-open`), `.sb-head`, `.brand`, `.brand-name`, `.sb-actions` (`.sb-new`, `.sb-link`), `.sb-divider`, `.sb-history`, `.sb-history-head`, `.sb-count`, `.sb-search`, `.sb-scroll`, `.sb-empty-state`, `.sb-group`, `.sb-label`, `.sb-chat`, `.sb-foot`, `.pool`, `.tail`, `.tail-more`, `.settings-menu` | Tiga kelompok yang dipisah jelas: aksi (dua tombol sepasang, tinggi 42px) → garis pemisah → riwayat (judul + jumlah, cari hanya muncul jika ada percakapan, daftar per tanggal dari `dateGroup()`), lalu kaki sidebar. Riwayat kosong memakai kotak bergaris putus dengan ikon jejak kaki |
| `Workspace` | `.app`, `.main` (`.is-welcome`), `.topbar`, `.topbar-title`, `.topbar-brand`, `.welcome`, `.welcome-inner`, `.eyebrow`, `.welcome-title`, `.thread`, `.thread-inner`, `.dock`, `.disclaimer` | Sapaan dari `greeting()` di `lib/ui.ts` |
| `Composer` | `.composer-wrap`, `.composer`, `.composer-bar`, `.composer-actions`, `.round-btn` (`.is-send`, `.is-stop`, `.is-listening`), `.suggestions`, `.chip` | Placeholder `Tanya ${APP_NAME}…`; textarea tumbuh sampai 220px; chip saran hanya di layar sambutan |
| `ModelPicker` | `.model-chip` (`.gem`, `.name`), `.model-menu` (`.is-top`, `.is-bottom`), `.menu-head`, `.menu-group`, `.option`, `.option-name`, `.option-id`, `.tag`, `.tag-default` | Lihat aturan posisi di bawah |
| `MessageView` | `.msg-user` + `.bubble`; `.msg-ai` (`.is-thinking`), `.msg-head`, `.msg-name`, `.msg-model`, `.msg-body`, `.thinking`, `.paws`, `.msg-note`, `.msg-error`, `.msg-actions` | |
| `Markdown` | `.md`, `.code`, `.code-head` | GFM; HTML mentah tidak dirender |
| `ApiGuide` | `.guide` (`<dialog>`, `::backdrop`), `.guide-head`, `.guide-body`, `.guide-label`, `.cred`, `.cred-row`, `.cred-key`, `.tabs`, `.tab`, `.model-list`, `.alias`, `.kv-list`, `.kv-row`, `.kv-status`, `.guide-note` | Panel 760px (layar penuh di mobile); blok kode memakai `.code` yang sama dengan Markdown |
| `FoxMark`, `FoxTrail` (`Paw`) | `.fox-mark` (`.is-glowing`), `.fox-shade`, `.fox-cheek`, `.fox-eye`, `.fox-nose`; `.trail` | |
| Umum | `.icon-btn` (`.icon-btn-sm`), `.btn` (`.btn-ghost`, `.btn-primary`, `.btn-block`), `.menu`, `.menu-anchor`, `.dot`, `.only-mobile`, `.only-desktop` | |

**Aturan posisi dropdown model (`ModelPicker`):** saat dibuka, `useLayoutEffect` mengukur ruang kosong di atas dan di bawah tombol, lalu memilih sisi sebelum menu tampil (tanpa kedipan):

1. Ke bawah jika ruang bawah muat seluruh menu, atau minimal ±300px (±5 model).
2. Jika tidak, ke sisi yang lebih lega.
3. `max-height` disamakan dengan ruang yang tersedia, dikurangi jarak 12px dari tepi layar; sisa model di-scroll.
4. Posisi dihitung ulang saat jendela diubah ukurannya.

Jangan kembali ke posisi tetap (selalu atas atau selalu bawah), karena menu akan terpotong di jendela yang pendek.

## 8. State dan animasi

- **Hover:** overlay hangat 5–7% (`rgba(255,228,214,…)`), atau border berubah ke `rgba(236,138,102,.4)` untuk chip dan tombol bergaris.
- **Aktif/terpilih:**
  - Opsi menu: latar `--fox-soft` + teks `--fox-text` + ikon centang.
  - Item riwayat: latar `--surface-2` + garis merah di kiri.
- **Fokus:**
  - Keyboard: outline 2px `--fox-light` (`:focus-visible`).
  - Kotak input: border merah dan cincin 4px.
  - Opsi menu: cincin inset 1px.
- **Berpikir:** jejak kaki `.paws` muncul bergantian (animasi `pawstep`) dan mata rubah menyala-redup (`.is-glowing`, animasi `glow`).
- **Error:** kotak merah transparan dengan ikon `CircleAlert`, lalu tombol ulangi.
- **Dihentikan:** teks parsial tetap tampil, ditambah catatan miring "Respons dihentikan."
- **Mic aktif:** tombol `--fox-soft` berdenyut.
- `prefers-reduced-motion: reduce` mematikan semua animasi dan transisi.

## 9. Teks UI

Bahasa Indonesia, singkat, kalimat biasa. Label mono boleh huruf kapital lewat CSS (`text-transform`), tapi teks sumbernya tetap ditulis biasa. Pesan error menjelaskan apa yang terjadi dan langkah berikutnya. Label baku:

- **Merek:** `Vulpes` (selalu miring) · tagline `Rubah merah yang cerdik, ditenagai semua key-mu.`
- **Navigasi:** `Percakapan baru` · `Cara pakai API` · `Riwayat` · `Cari percakapan` · kosong: `Belum ada percakapan` / `Mulai lewat tombol Percakapan baru.` · `Hari ini` / `Kemarin` / `7 hari terakhir` / `Lebih lama` · `Chat baru` · `Keluar & ganti token` · `Hapus semua riwayat`
- **Sambutan:** `Selamat pagi/siang/sore/malam · N key siap` · `Mau tanya apa hari ini?` · chip `Jelaskan sederhana`, `Ringkas teks`, `Perbaiki kode`, `Terjemahkan`
- **Kotak input:** `Tanya Vulpes…` · `Pilih model` · `Kirim` · `Hentikan` · `Bicara`
- **Jawaban:** `Mengendus jawaban…` · `Respons dihentikan.` · `Salin` / `Tersalin` · `Ulangi jawaban`
- **Panduan API:** judul `Cara pakai API` · bagian `1 · Kredensial`, `2 · Contoh kode`, `3 · Model`, `4 · Endpoint`, `5 · Kode status` · tab `cURL`, `Python`, `JavaScript`, `n8n / LangChain` · placeholder token `TOKEN_KAMU`
- **Layar token:** `Token akses` · `Tempel GATEWAY_TOKEN` · `Ingat di perangkat ini` · `Masuk` / `Memeriksa…`
- **Model:** grup `Vulpes` dan `Model terbuka` · nama `Vulpes 3.8 Flash` · id `vulpes-3.8-flash` (tampilan saja; id asli `gemini-3.8-flash`)
- **Tag model:** `default` · `cepat` (model lite) · `otomatis` (alias `-latest`)

## 10. Aksesibilitas

- Setiap tombol ikon wajib punya `aria-label` dan `title`. Logo dan jejak kaki memakai `aria-hidden`.
- Teks minimal kontras 4,5:1; `--text-faint` jangan ditaruh di atas permukaan yang lebih terang dari `--surface-2`.
- Dropdown model memakai pola listbox: `role="listbox"`, `role="group"` per kelompok, dan `role="option"` dengan `aria-selected`.
  - Panah atas/bawah di tombol membuka menu, lalu fokus pindah ke model terpilih.
  - Panah, Home, dan End berpindah antar-opsi; Enter memilih.
  - Escape menutup menu dan mengembalikan fokus ke tombol; Tab menutup menu.
- Popover lain tertutup dengan klik di luar atau Escape (`useDismiss`).
- Kotak input: Enter mengirim, Shift+Enter membuat baris baru, dan Enter diabaikan saat IME sedang menyusun kata.
- Error memakai `role="alert"`.

## 11. Responsif

- **≥ 768px:** sidebar statis dan bisa diciutkan menjadi rel 68px (toggle, tombol "+", ikon `</>` panduan API, gear). Statusnya disimpan di `gw:sidebar-collapsed`.
- **< 768px:**
  - Sidebar menjadi drawer (`position: fixed`, `translateX`) dengan backdrop gelap dan tombol X.
  - Topbar menampilkan tombol menu dan merek (`.topbar-brand`).
  - Tombol teks di topbar menjadi ikon saja.
  - Jejak kaki tetap tampil dengan lebar 78vw.
- Pakai `.only-mobile` dan `.only-desktop` untuk elemen yang hanya muncul di satu ukuran; jangan mendeteksi ukuran layar lewat JavaScript.

## 12. Checklist perubahan UI

- [ ] Warna memakai token di `:root`, bukan hex baru di komponen.
- [ ] Identitas tetap Vulpes (rubah merah). Tidak ada sisa Gapura, dan tidak ada logo atau aset merek Google/Gemini.
- [ ] Nama Vulpes tetap miring; font sesuai peran (display / UI / mono).
- [ ] Teks berbahasa Indonesia dan konsisten dengan label baku.
- [ ] Tidak ada tombol yang tidak berfungsi.
- [ ] Tombol ikon punya `aria-label` dan `title`.
- [ ] Dropdown/popover tidak terpotong di jendela pendek (cek di tinggi ±600px).
- [ ] Dicek di desktop dan mobile lewat `scripts/screenshot.mjs`.
- [ ] `npm run build` lolos.
