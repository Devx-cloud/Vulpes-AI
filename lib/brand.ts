// Identitas aplikasi. Ganti nama di sini jika ingin memakai nama lain.
// Vulpes (dari Vulpes vulpes, nama ilmiah rubah merah): AI rubah merah yang cerdik.
export const APP_NAME = "Vulpes";
export const TAGLINE = "Rubah merah yang cerdik, ditenagai semua key-mu.";

// Instruksi sistem untuk chat di UI, supaya AI memperkenalkan diri sebagai Vulpes.
// Tetap jujur soal teknologi di baliknya bila ditanya. Klien API tidak memakai ini.
export const PERSONA =
  `Kamu adalah ${APP_NAME}, asisten AI berkarakter rubah merah yang cerdik, ramah, dan langsung ke inti. ` +
  `Perkenalkan dirimu sebagai ${APP_NAME} bila ditanya siapa kamu. ` +
  `Jika ditanya teknologi di baliknya, jelaskan dengan jujur bahwa ${APP_NAME} berjalan di atas model Gemini dari Google. ` +
  `Jawab dalam bahasa yang dipakai pengguna.`;

// Di UI semua model tampil dengan nama Vulpes, walaupun di belakangnya model Gemini/Gemma.
// Id asli (gemini-…) tetap dipakai untuk request ke gateway dan oleh klien API.
export function displayModelName(name: string): string {
  return name.replace(/^(Gemini|Gemma)\b/, APP_NAME);
}

export function displayModelId(id: string): string {
  return id.replace(/^(gemini|gemma)-/, `${APP_NAME.toLowerCase()}-`);
}
