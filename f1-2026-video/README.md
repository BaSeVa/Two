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
npx remotion render F1DriversChampionship2026 out/f1-2026.mp4 --gl=angle   # без GPU: --gl=swangle
npx remotion still Cover out/cover.png   # обложка 1080×1920
python3 scripts/make_sfx.py         # пересобрать эффекты public/sfx.wav (тайминги берутся из сцен)
node scripts/generate-soundtrack.mjs 60   # музыка из ElevenLabs → public/soundtrack.mp3
```

## Саундтрек ElevenLabs

`scripts/generate-soundtrack.mjs` вызывает ElevenLabs Music API и сохраняет трек в `public/soundtrack.mp3`.
Нужна переменная окружения `ELEVENLABS_API_KEY`. Если файл есть, видео играет музыку и приглушённые
эффекты поверх неё; если нет — только синтезированные эффекты.

## 3D-фоны

Под графикой всех сцен идут 3D-сцены на React Three Fiber (`src/three/`): низкополигональные болиды в цветах
команд топ-6 на ночной трассе, без имён и логотипов. Всё анимируется от кадра Remotion.

| Сцена видео | 3D-фон | Что в кадре |
|---|---|---|
| Стартовые огни | `StartGrid3D` | решётка стоит, на «огни погасли» болиды уходят со старта |
| Этап за этапом | `RaceLoop3D` | камера летит за пелотоном, болиды меняются местами |
| График сезона | `Aerial3D` | вид с дрона на пелотон на трассе |
| Пелотон | `PitLane3D` | пит-лейн: болиды команд с 11-го места и ниже у боксов |
| Подиум | `Podium3D` | болиды топ-3 на ступенях, конфетти, облёт камеры |
| Кто в форме | `Overtake3D` | болид команды лидера формы обгоняет соперников |
| Финал | `Finish3D` | три болида пересекают клетчатую линию финиша |
| Обложка TikTok | `CoverHero3D` | четыре болида лидирующих команд летят на камеру |

Каждый фон можно открыть отдельно в Studio (папка `Backdrops3D`). Для рендера нужен WebGL:
`--gl=angle` на машине с GPU, `--gl=swangle` без него (медленнее).

## Видеовставки Kling

`scripts/generate-kling-clips.mjs` генерирует через Kling API (text-to-video, 9:16) атмосферные клипы
из `scripts/kling-clips.json` и сохраняет их в `public/kling/<id>.mp4`. Нужны `KLING_ACCESS_KEY` и
`KLING_SECRET_KEY`; модель и режим меняются через `KLING_MODEL` (по умолчанию `kling-v1-6`) и `KLING_MODE` (`std` | `pro`).

| Клип | Сцена | Что в кадре |
|---|---|---|
| `start` | стартовые огни | огни гаснут, пелотон уходит со старта |
| `night-race` | этап за этапом | ночная уличная трасса |
| `champagne` | подиум | шампанское и конфетти |
| `finish` | финал | клетчатый флаг на финише |

Клипы лежат под графикой с затемнением, данные FIA рисует только Remotion. В промптах нет реальных
пилотов, логотипов и надписей — болиды обезличенные, в цветах команд. Если клип есть, он заменяет 3D-фон этой сцены; если нет — играет 3D.

```console
node scripts/generate-kling-clips.mjs              # все клипы
node scripts/generate-kling-clips.mjs champagne    # один клип
```
