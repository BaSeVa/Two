// Генерирует музыкальный саундтрек через ElevenLabs Music API и сохраняет его в public/soundtrack.mp3.
// Нужна переменная окружения ELEVENLABS_API_KEY.
// Запуск: node scripts/generate-soundtrack.mjs [длительность_в_секундах]

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY не задан");
  process.exit(1);
}

const seconds = Number(process.argv[2] ?? 60);
const prompt = [
  "High-energy Formula 1 TV broadcast theme for a vertical social video.",
  "Driving electronic rock: pulsing synth bass, distorted guitar riffs, punchy live drums, 140 BPM.",
  "0-4s: tense build-up with ticking hi-hats like start lights, then a big drop at 3 seconds.",
  "Relentless racing energy through the middle, short breakdown around 40 seconds,",
  "final triumphant climax and a clean ending at the very end. Instrumental, no vocals.",
].join(" ");

const response = await fetch(
  "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
  {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: Math.round(seconds * 1000),
      model_id: "music_v1",
    }),
  },
);

if (!response.ok) {
  console.error(`ElevenLabs ответил ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "soundtrack.mp3");
writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
console.log(`wrote ${dest}`);
