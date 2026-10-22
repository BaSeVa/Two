# F1 2026 — гонка за чемпионством (9:16)

Вертикальное видео 1080×1920, 30 fps, 60 с, сделано на [Remotion](https://www.remotion.dev).
Готовый ролик: [`../videos/гонка-за-чемпионством.mp4`](../videos/гонка-за-чемпионством.mp4).
Обложка для TikTok: [`../videos/гонка-за-чемпионством-обложка.png`](../videos/гонка-за-чемпионством-обложка.png),
название, описание и хештеги: [`../videos/гонка-за-чемпионством-tiktok.txt`](../videos/гонка-за-чемпионством-tiktok.txt).

Сцены: стартовые огни → гонка топ-10 этап за этапом (17 этапов) → график сезона топ-6 → пелотон P11–P23 → подиум топ-3 → «кто в форме» (последние 5 этапов) → отрыв лидера и следующий этап.

## Данные

Источник — официальный документ FIA: 2026 Singapore Grand Prix, Doc 91 «Championship Points»
([PDF](https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_championship_points.pdf)).
Итоговые очки (`STANDINGS`) и очки за каждый этап (`ROUND_POINTS`) лежат в `src/data.ts`.
Чтобы обновить ролик под новый этап, добавьте колонку в `ROUND_POINTS`, название в `ROUNDS`
и поправьте `STANDINGS`, `STANDINGS_AFTER` и `RACES_LEFT`.

## Команды

```console
npm i
npm run dev                         # превью в Remotion Studio
npx remotion render F1DriversChampionship2026 out/f1-2026.mp4
npx remotion still Cover out/cover.png   # обложка 1080×1920
python3 scripts/make_sfx.py         # пересобрать эффекты public/sfx.wav (тайминги берутся из сцен)
node scripts/generate-soundtrack.mjs 60   # музыка из ElevenLabs → public/soundtrack.mp3
```

## Саундтрек ElevenLabs

`scripts/generate-soundtrack.mjs` вызывает ElevenLabs Music API и сохраняет трек в `public/soundtrack.mp3`.
Нужна переменная окружения `ELEVENLABS_API_KEY`. Если файл есть, видео играет музыку и приглушённые
эффекты поверх неё; если нет — только синтезированные эффекты.
