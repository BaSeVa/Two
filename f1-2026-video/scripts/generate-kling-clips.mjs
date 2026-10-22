// Генерирует атмосферные видеовставки через Kling API (text-to-video, 9:16) и сохраняет их
// в public/kling/<id>.mp4. Список клипов и промпты — scripts/kling-clips.json.
// Нужны переменные окружения KLING_ACCESS_KEY и KLING_SECRET_KEY.
// Необязательные: KLING_MODEL (по умолчанию kling-v1-6), KLING_MODE (std | pro),
// KLING_API (по умолчанию https://api-singapore.klingai.com).
// Запуск: node scripts/generate-kling-clips.mjs [id ...]   — без аргументов генерирует все клипы

import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const accessKey = process.env.KLING_ACCESS_KEY;
const secretKey = process.env.KLING_SECRET_KEY;
if (!accessKey || !secretKey) {
  console.error("KLING_ACCESS_KEY и KLING_SECRET_KEY должны быть заданы");
  process.exit(1);
}

const API = process.env.KLING_API ?? "https://api-singapore.klingai.com";
const MODEL = process.env.KLING_MODEL ?? "kling-v1-6";
const MODE = process.env.KLING_MODE ?? "std";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "kling");
const config = JSON.parse(readFileSync(join(here, "kling-clips.json"), "utf8"));

// Kling принимает JWT (HS256), подписанный секретным ключом
const b64url = (data) => Buffer.from(data).toString("base64url");
const token = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }));
  const signature = createHmac("sha256", secretKey).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
};

const call = async (path, init = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.code !== 0) {
    throw new Error(`Kling ${path}: HTTP ${response.status}, ${JSON.stringify(body)}`);
  }
  return body.data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generate = async (clip) => {
  const task = await call("/v1/videos/text2video", {
    method: "POST",
    body: JSON.stringify({
      model_name: MODEL,
      mode: MODE,
      prompt: clip.prompt,
      negative_prompt: config.negative_prompt,
      aspect_ratio: "9:16",
      duration: clip.duration,
      cfg_scale: 0.5,
    }),
  });
  console.log(`${clip.id}: задача ${task.task_id} создана`);

  for (let attempt = 0; attempt < 120; attempt++) {
    await sleep(10_000);
    const status = await call(`/v1/videos/text2video/${task.task_id}`);
    if (status.task_status === "succeed") {
      const url = status.task_result.videos[0].url;
      const video = await fetch(url);
      if (!video.ok) throw new Error(`${clip.id}: не удалось скачать ${url}`);
      const dest = join(outDir, `${clip.id}.mp4`);
      writeFileSync(dest, Buffer.from(await video.arrayBuffer()));
      console.log(`${clip.id}: сохранён ${dest}`);
      return;
    }
    if (status.task_status === "failed") {
      throw new Error(`${clip.id}: генерация не удалась — ${status.task_status_msg ?? "без описания"}`);
    }
  }
  throw new Error(`${clip.id}: не дождались результата за 20 минут`);
};

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const wanted = process.argv.slice(2);
const clips = config.clips.filter((c) => wanted.length === 0 || wanted.includes(c.id));
if (clips.length === 0) {
  console.error(`Нет клипов с id: ${wanted.join(", ")}`);
  process.exit(1);
}

const results = await Promise.allSettled(clips.map(generate));
const failed = results.filter((r) => r.status === "rejected");
for (const r of failed) console.error(r.reason.message);
process.exit(failed.length ? 1 : 0);
