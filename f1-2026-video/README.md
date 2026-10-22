# F1 2026 — гонка за Кубок пилотов (9:16)

Вертикальное видео 1080×1920, 30 fps, ~27 с, сделано на [Remotion](https://www.remotion.dev).
Готовый ролик: [`../videos/f1-2026-drivers-championship.mp4`](../videos/f1-2026-drivers-championship.mp4).

Сцены: стартовые огни → «гонка» топ-10 по очкам → пелотон P11–P23 → подиум топ-3 → отрыв лидера.

## Данные

Все очки лежат в `src/data.ts` (личный зачёт после Гран-при Сингапура 2026).
fia.com был недоступен из окружения сборки, поэтому таблица сведена по совпадающим
публикациям (Forbes, GPFans, Motorsport Week, RaceFans). Чтобы обновить ролик под новый этап,
поменяйте `STANDINGS`, `STANDINGS_AFTER` и `RACES_LEFT`.

## Команды

```console
npm i
npm run dev                         # превью в Remotion Studio
npx remotion render F1DriversChampionship2026 out/f1-2026.mp4
python3 scripts/make_sfx.py         # пересобрать звуковую дорожку public/sfx.wav
```
