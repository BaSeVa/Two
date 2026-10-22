# F1 2026 — гонка за Кубок пилотов (9:16)

Вертикальное видео 1080×1920, 30 fps, ~30 с, сделано на [Remotion](https://www.remotion.dev).
Готовый ролик: [`../videos/f1-2026-drivers-championship.mp4`](../videos/f1-2026-drivers-championship.mp4).

Сцены: стартовые огни → гонка топ-10 этап за этапом (17 этапов) → пелотон P11–P23 → подиум топ-3 → отрыв лидера.

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
python3 scripts/make_sfx.py         # пересобрать звуковую дорожку public/sfx.wav
```
