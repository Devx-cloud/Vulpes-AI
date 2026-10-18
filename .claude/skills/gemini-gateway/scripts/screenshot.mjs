#!/usr/bin/env node
// Ambil screenshot UI Gemini Gateway lewat Chrome/Edge headless (Chrome DevTools Protocol, tanpa dependensi).
// Server harus sudah jalan (npm run dev / npx next start). Token dibaca dari .env.
//
//   node .claude/skills/gemini-gateway/scripts/screenshot.mjs [opsi]
//     --url <url>        default http://localhost:3000
//     --out <folder>     default <tmp>/gemini-gateway-shots
//     --env <file>       default .env (sumber GATEWAY_TOKEN; env var GATEWAY_TOKEN diutamakan)
//     --prompt "<teks>"  kirim satu pesan dan foto jawabannya (memakai 1 request kuota Gemini)
//     --browser <path>   path Chrome/Edge jika tidak terdeteksi otomatis
//
// Hasil: 1-gate.png, 2-welcome.png, 3-chat.png (jika --prompt), 4-mobile.png, 5-mobile-drawer.png
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: opt } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: join(tmpdir(), "gemini-gateway-shots") },
    env: { type: "string", default: ".env" },
    prompt: { type: "string" },
    browser: { type: "string" },
  },
});

const token =
  process.env.GATEWAY_TOKEN ??
  (existsSync(opt.env) ? readFileSync(opt.env, "utf8").match(/^GATEWAY_TOKEN=(.*)$/m)?.[1]?.trim() : undefined);
if (!token) throw new Error(`GATEWAY_TOKEN tidak ditemukan (env var atau ${opt.env})`);

const browser = [
  opt.browser,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find(p => p && existsSync(p));
if (!browser) throw new Error("Chrome/Edge tidak ditemukan. Pakai --browser <path>.");

mkdirSync(opt.out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "gw-profile-")); // profil bersih: belum ada token/riwayat
const port = 9300 + Math.floor(Math.random() * 600);
const proc = spawn(
  browser,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--remote-allow-origins=*",
    "--no-first-run",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;

try {
  let target;
  for (let i = 0; i < 150 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find(t => t.type === "page");
    } catch {
      // browser belum siap
    }
  }
  if (!target) throw new Error("Browser headless tidak merespons.");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener("message", e => {
    const msg = JSON.parse(e.data);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  const cdp = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, m => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const js = async expr =>
    (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
  const waitFor = async (expr, label, ms = 90000) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(400)) if (await js(expr)) return;
    throw new Error(`Timeout menunggu: ${label}`);
  };
  const shot = async name => {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    const file = join(opt.out, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log("tersimpan:", file);
  };
  // Isi input yang dikendalikan React: pakai setter bawaan lalu kirim event input.
  const setValue = (sel, value) =>
    js(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
  const click = sel => js(`document.querySelector(${JSON.stringify(sel)}).click()`);
  const viewport = (width, height, mobile) =>
    cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await viewport(1440, 900, false);
  await cdp("Page.navigate", { url: opt.url });
  await waitFor(`!!document.querySelector(".gate")`, "layar token");
  await sleep(800);
  await shot("1-gate");

  await setValue(".field input", token);
  await click(".gate-card button[type=submit]");
  await waitFor(`!!document.querySelector(".welcome") || !!document.querySelector(".gate-error")`, "login");
  const loginError = await js(`document.querySelector(".gate-error")?.textContent ?? ""`);
  if (loginError) throw new Error(`Login gagal: ${loginError}`);
  await sleep(1500); // tunggu daftar model
  await shot("2-welcome");

  if (opt.prompt) {
    await setValue(".composer textarea", opt.prompt);
    await click(".round-btn.is-send");
    await waitFor(`!!document.querySelector(".msg-ai")`, "jawaban mulai");
    await waitFor(`!document.querySelector(".is-thinking")`, "jawaban selesai");
    await sleep(500);
    await shot("3-chat");
    const error = await js(`[...document.querySelectorAll(".msg-error")].at(-1)?.textContent ?? ""`);
    if (error) console.log("pesan error di UI:", error);
  }

  await viewport(390, 844, true);
  await cdp("Page.reload");
  await waitFor(`!!document.querySelector(".welcome")`, "layar sambutan mobile");
  await sleep(1000);
  await shot("4-mobile");
  await click(".topbar .only-mobile");
  await sleep(400);
  await shot("5-mobile-drawer");
} finally {
  ws?.close();
  proc.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // file profil kadang masih dikunci browser di Windows
  }
}
process.exit(0);
