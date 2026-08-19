/*
 * generator.js — процедурная генерация плана города.
 *
 * Идея: город описывается в полярной системе координат. Кольцевые улицы
 * (rings) и радиальные проспекты (radials) режут его на ячейки-кварталы.
 * Каждая ячейка — это прямоугольник в параметрических координатах (u, t),
 * который отображается в мир функцией cell.map(u, t). Поэтому все дальнейшие
 * разбиения (кварталы, участки, дома) делаются простым рекурсивным делением
 * прямоугольника — никакой сложной геометрии отсечения не требуется, а улицы
 * получаются криволинейными и повторяют планировку города.
 */
(function (global) {
  'use strict';
  const CM = (global.CM = global.CM || {});
  const G = CM.G;
  const TAU = G.TAU;
  const lerp = G.lerp;

  /* --------------------------------------------------------------------- */
  /* Типы кварталов                                                         */
  /* --------------------------------------------------------------------- */

  const DISTRICTS = {
    citadel:     { title: 'Цитадель',      kind: 'buildings', block: 150, lot: 62, coverage: 0.55, setback: 5,   floors: [3, 6], dens: 0.02,  color: 'civic' },
    plaza:       { title: 'Площадь',       kind: 'plaza',     block: 190, lot: 44, coverage: 0.22, setback: 4,   floors: [2, 4], dens: 0.02,  color: 'civic' },
    temple:      { title: 'Храмы',         kind: 'buildings', block: 120, lot: 44, coverage: 0.5,  setback: 5,   floors: [2, 4], dens: 0.01,  color: 'civic' },
    oldtown:     { title: 'Старый город',  kind: 'buildings', block: 72,  lot: 15, coverage: 0.92, setback: 1,   floors: [2, 4], dens: 0.05,  color: 'old' },
    market:      { title: 'Торговля',      kind: 'buildings', block: 84,  lot: 19, coverage: 0.74, setback: 1.6, floors: [2, 3], dens: 0.035, color: 'trade' },
    residential: { title: 'Жилой',         kind: 'buildings', block: 96,  lot: 24, coverage: 0.78, setback: 2.2, floors: [1, 3], dens: 0.04,  color: 'house' },
    suburb:      { title: 'Окраина',       kind: 'buildings', block: 132, lot: 34, coverage: 0.5,  setback: 5,   floors: [1, 2], dens: 0.03,  color: 'house' },
    industrial:  { title: 'Промзона',      kind: 'buildings', block: 158, lot: 56, coverage: 0.6,  setback: 4,   floors: [1, 2], dens: 0.006, color: 'work' },
    docks:       { title: 'Пристани',      kind: 'buildings', block: 126, lot: 40, coverage: 0.55, setback: 3,   floors: [1, 2], dens: 0.01,  color: 'work' },
    park:        { title: 'Парк',          kind: 'park',      block: 150, lot: 0,  coverage: 0,    setback: 0,   floors: [0, 0], dens: 0,     color: 'green' },
    farm:        { title: 'Поля',          kind: 'field',     block: 220, lot: 0,  coverage: 0,    setback: 0,   floors: [0, 0], dens: 0,     color: 'field' },
    forest:      { title: 'Лес',           kind: 'forest',    block: 200, lot: 0,  coverage: 0,    setback: 0,   floors: [0, 0], dens: 0,     color: 'green' },
    water:       { title: 'Вода',          kind: 'water',     block: 200, lot: 0,  coverage: 0,    setback: 0,   floors: [0, 0], dens: 0,     color: 'water' },
  };

  /** Порядок типов для «кисти» в интерфейсе. */
  const DISTRICT_ORDER = ['citadel', 'plaza', 'temple', 'oldtown', 'market', 'residential',
    'suburb', 'industrial', 'docks', 'park', 'farm', 'forest', 'water'];

  const DEFAULTS = {
    seed: 'CITY',
    era: 'medieval',      // medieval | modern
    rings: 5,             // число кольцевых улиц
    radials: 9,           // число радиальных проспектов
    irregularity: 0.55,   // кривизна улиц и разброс кварталов
    density: 1,           // плотность застройки (масштаб кварталов)
    parks: 0.5,           // доля зелени
    river: true,
    walls: true,
    outskirts: true,
    style: 'parchment',
    overrides: {},        // ручные правки: "i,j" -> тип квартала
  };

  const R = 1000; // радиус города в условных метрах

  /* --------------------------------------------------------------------- */
  /* Полярный каркас                                                        */
  /* --------------------------------------------------------------------- */

  /** Радиус кольца i под углом th (с гармоническим «шумом»). */
  function ringRadius(ring, th) {
    let k = 1;
    for (const h of ring.harm) k += h.a * Math.sin(h.k * th + h.p);
    return ring.r * k;
  }

  /** Угол радиального проспекта на нормированном радиусе gt (0 — центр, 1 — стена). */
  function radialAngle(rad, gt) {
    return rad.a + rad.amp * Math.sin(Math.PI * Math.min(gt, 1));
  }

  /** Радиус точки на нормированном радиусе gt под углом th. */
  function radiusAtNorm(city, gt, th) {
    const x = G.clamp(gt * city.K, 0, city.ringsN);
    const i = Math.min(Math.floor(x), city.ringsN - 1);
    const f = x - i;
    return lerp(ringRadius(city.rings[i], th), ringRadius(city.rings[i + 1], th), f);
  }

  /** Функция отображения (u, t) -> мировые координаты для ячейки (i, j). */
  function makeCellMap(city, i, j) {
    const rads = city.radials, n = rads.length, K = city.K;
    const rIn = city.rings[i], rOut = city.rings[i + 1];
    const a0 = rads[j], a1 = rads[(j + 1) % n];
    return function (u, t) {
      const gt = (i + t) / K;
      const aL = radialAngle(a0, gt);
      let aR = radialAngle(a1, gt);
      while (aR <= aL) aR += TAU;
      const th = aL + (aR - aL) * u;
      const r = lerp(ringRadius(rIn, th), ringRadius(rOut, th), t);
      return [Math.cos(th) * r, Math.sin(th) * r];
    };
  }

  /** Многоугольник по прямоугольнику в параметрическом пространстве. */
  function rectPoly(map, r, nu, nt) {
    nu = Math.max(1, nu | 0); nt = Math.max(1, nt | 0);
    const pts = [];
    for (let a = 0; a <= nu; a++) pts.push(map(lerp(r.u0, r.u1, a / nu), r.t0));
    for (let b = 1; b <= nt; b++) pts.push(map(r.u1, lerp(r.t0, r.t1, b / nt)));
    for (let a = nu - 1; a >= 0; a--) pts.push(map(lerp(r.u0, r.u1, a / nu), r.t1));
    for (let b = nt - 1; b >= 1; b--) pts.push(map(r.u0, lerp(r.t0, r.t1, b / nt)));
    return pts;
  }

  /* --------------------------------------------------------------------- */
  /* Рекурсивное деление прямоугольника                                     */
  /* --------------------------------------------------------------------- */

  /**
   * Делит параметрический прямоугольник на части заданного мирового размера,
   * оставляя между частями зазор gap (будущая улица).
   */
  function subdivide(rect, W, H, target, gap, jitter, rng, out, depth) {
    const w = W * (rect.u1 - rect.u0);
    const h = H * (rect.t1 - rect.t0);
    if (w <= 0.5 || h <= 0.5) return;
    const big = Math.max(w, h);
    if (depth > 11 || big <= target * 1.35) { out.push(rect); return; }

    const ratio = 0.5 + rng.range(-jitter, jitter);
    if (w >= h) {
      const g = gap / W;
      const um = rect.u0 + (rect.u1 - rect.u0) * ratio;
      const l = { u0: rect.u0, u1: um - g / 2, t0: rect.t0, t1: rect.t1 };
      const r = { u0: um + g / 2, u1: rect.u1, t0: rect.t0, t1: rect.t1 };
      if (l.u1 > l.u0) subdivide(l, W, H, target, gap, jitter, rng, out, depth + 1);
      if (r.u1 > r.u0) subdivide(r, W, H, target, gap, jitter, rng, out, depth + 1);
    } else {
      const g = gap / H;
      const tm = rect.t0 + (rect.t1 - rect.t0) * ratio;
      const b = { u0: rect.u0, u1: rect.u1, t0: rect.t0, t1: tm - g / 2 };
      const t = { u0: rect.u0, u1: rect.u1, t0: tm + g / 2, t1: rect.t1 };
      if (b.t1 > b.t0) subdivide(b, W, H, target, gap, jitter, rng, out, depth + 1);
      if (t.t1 > t.t0) subdivide(t, W, H, target, gap, jitter, rng, out, depth + 1);
    }
  }

  /** Сжимает прямоугольник на m мировых метров с каждой стороны. */
  function inset(rect, W, H, mu, mt) {
    const du = mu / W, dt = mt / H;
    const r = { u0: rect.u0 + du, u1: rect.u1 - du, t0: rect.t0 + dt, t1: rect.t1 - dt };
    return (r.u1 > r.u0 && r.t1 > r.t0) ? r : null;
  }

  /* --------------------------------------------------------------------- */
  /* Река                                                                   */
  /* --------------------------------------------------------------------- */

  function makeRiver(seed, rng) {
    const inA = rng.range(0, TAU);
    const outA = inA + Math.PI + rng.range(-0.7, 0.7);
    const far = R * 1.45;
    const A = [Math.cos(inA) * far, Math.sin(inA) * far];
    const B = [Math.cos(outA) * far, Math.sin(outA) * far];
    const ctrl = [A];
    const steps = rng.int(3, 4);
    // изгиб реки: середина русла уходит в сторону, чтобы не рассекать центр строго пополам
    const bendDir = rng.sign();
    const offset = rng.range(0.12, 0.5) * R;
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    for (let s = 1; s <= steps; s++) {
      const f = s / (steps + 1);
      const bend = Math.sin(Math.PI * f) * offset * bendDir;
      ctrl.push([
        lerp(A[0], B[0], f) + nx * bend + rng.range(-0.07, 0.07) * R,
        lerp(A[1], B[1], f) + ny * bend + rng.range(-0.07, 0.07) * R,
      ]);
    }
    ctrl.push(B);
    const pts = G.smoothPath(ctrl, 16);
    const width = rng.range(26, 52);
    return { pts, width, bounds: G.bounds(pts), inA, outA };
  }

  function makeRiverTest(river) {
    if (!river) return function () { return Infinity; };
    const b = river.bounds, pad = river.width + 60;
    return function (p) {
      if (p[0] < b.minX - pad || p[0] > b.maxX + pad || p[1] < b.minY - pad || p[1] > b.maxY + pad) return Infinity;
      return G.distToPolyline(p, river.pts);
    };
  }

  /* --------------------------------------------------------------------- */
  /* Назначение типов кварталов                                             */
  /* --------------------------------------------------------------------- */

  const WEIGHTS = {
    medieval: [
      [['oldtown', 6], ['market', 3], ['temple', 2], ['plaza', 1.2], ['park', 1]],
      [['oldtown', 4], ['market', 3], ['residential', 5], ['temple', 1.5], ['park', 1.5]],
      [['residential', 7], ['market', 2], ['suburb', 2], ['park', 2], ['industrial', 1.2]],
      [['suburb', 6], ['residential', 3], ['industrial', 3], ['park', 2], ['farm', 1.5]],
    ],
    modern: [
      [['plaza', 2], ['market', 4], ['temple', 1], ['residential', 4], ['park', 1.5]],
      [['residential', 6], ['market', 4], ['park', 2], ['oldtown', 1]],
      [['residential', 7], ['industrial', 2.5], ['park', 2.5], ['market', 2], ['suburb', 2]],
      [['suburb', 5], ['industrial', 5], ['residential', 3], ['park', 2], ['farm', 1]],
    ],
  };

  function autoDistrict(city, cell, rng) {
    const K = city.K;
    if (cell.i >= K) return rng.weighted([['farm', 5], ['forest', 3.5], ['suburb', 2.5]]);
    const f = cell.i / K;
    const table = WEIGHTS[city.params.era] || WEIGHTS.medieval;
    const band = f < 0.25 ? 0 : f < 0.5 ? 1 : f < 0.78 ? 2 : 3;
    const pairs = table[band].map((p) => [p[0], p[0] === 'park' ? p[1] * (0.3 + city.params.parks * 2.2) : p[1]]);
    if (cell.riverFrac > 0.25 && f > 0.15 && rng.bool(0.45)) return 'docks';
    return rng.weighted(pairs);
  }

  /* --------------------------------------------------------------------- */
  /* Наполнение ячейки                                                      */
  /* --------------------------------------------------------------------- */

  function fillCell(city, cell) {
    const cfg = DISTRICTS[cell.type] || DISTRICTS.residential;
    const p = city.params;
    const rng = CM.rngFor(p.seed, 'cell:' + cell.i + ':' + cell.j + ':' + cell.type);
    const dens = G.clamp(p.density, 0.4, 2);
    const modern = p.era === 'modern';
    const jitter = (modern ? 0.06 : 0.14) * (0.4 + p.irregularity);

    cell.blocks = [];
    cell.buildings = [];
    cell.decor = [];

    const W = cell.W, H = cell.H;
    const streetW = (modern ? 13 : 9) * (cell.i >= city.K ? 1.4 : 1);
    const alleyW = modern ? 6 : 4;

    const area = inset({ u0: 0, u1: 1, t0: 0, t1: 1 }, W, H, cell.marginU, cell.marginT);
    if (!area) return;

    if (cfg.kind === 'water') { // квартал целиком под водой — озеро/затон
      cell.blocks.push({ poly: rectPoly(cell.map, area, 14, 6), kind: 'water', water: false });
      return;
    }

    const blockTarget = cfg.block / dens * (cell.i >= city.K ? 1.5 : 1);
    const blocks = [];
    subdivide(area, W, H, blockTarget, streetW, jitter, rng, blocks, 0);

    for (const b of blocks) {
      const bw = W * (b.u1 - b.u0), bh = H * (b.t1 - b.t0);
      if (bw < 4 || bh < 4) continue;
      const poly = rectPoly(cell.map, b, Math.max(2, Math.round(bw / 24)), Math.max(2, Math.round(bh / 24)));
      const c = G.polyCentroid(poly);
      const waterDist = city.riverDist(c);
      const inWater = city.river && waterDist < city.river.width * 0.5 + 6;
      cell.blocks.push({ poly, kind: cfg.kind, water: inWater });
      if (inWater) continue;

      if (cfg.kind === 'park' || cfg.kind === 'forest') {
        plantTrees(cell, b, W, H, rng, cfg.kind === 'forest' ? 0.9 : 0.5);
        continue;
      }
      if (cfg.kind === 'field') {
        makeField(cell, b, W, H, rng);
        continue;
      }
      buildLots(city, cell, cfg, b, W, H, rng, alleyW, dens);
    }

    if (cfg.kind === 'plaza') addPlazaDecor(cell, area, W, H, rng);
  }

  function buildLots(city, cell, cfg, block, W, H, rng, alleyW, dens) {
    const lots = [];
    const jitter = cell.type === 'oldtown' ? 0.22 : 0.12;
    subdivide(block, W, H, cfg.lot / dens, alleyW, jitter, rng, lots, 0);
    const river = city.river;
    for (const l of lots) {
      if (!rng.bool(cfg.coverage)) continue;
      const lw = W * (l.u1 - l.u0), lh = H * (l.t1 - l.t0);
      if (lw < 3 || lh < 3) continue;
      const setU = cfg.setback * rng.range(0.6, 1.6);
      const setT = cfg.setback * rng.range(0.6, 1.6);
      const r = inset(l, W, H, Math.min(setU, lw * 0.3), Math.min(setT, lh * 0.3));
      if (!r) continue;
      const poly = rectPoly(cell.map, r, W * (r.u1 - r.u0) > 40 ? 2 : 1, H * (r.t1 - r.t0) > 40 ? 2 : 1);
      const c = G.polyCentroid(poly);
      if (river) {
        const d = city.riverDist(c);
        if (d < river.width * 0.5 + (cell.type === 'docks' ? 3 : 9)) continue;
      }
      const areaM2 = G.polyArea(poly);
      if (areaM2 < 6) continue;
      const floors = rng.int(cfg.floors[0], cfg.floors[1]);
      cell.buildings.push({
        poly, c, area: areaM2, floors,
        tone: cfg.color,
        shade: rng.int(0, 3),
        pop: Math.round(areaM2 * floors * cfg.dens),
      });
    }
  }

  function plantTrees(cell, rect, W, H, rng, density) {
    const w = W * (rect.u1 - rect.u0), h = H * (rect.t1 - rect.t0);
    const n = Math.round((w * h) / 900 * density);
    for (let i = 0; i < n; i++) {
      const u = rng.range(rect.u0, rect.u1), t = rng.range(rect.t0, rect.t1);
      cell.decor.push({ type: 'tree', p: cell.map(u, t), r: rng.range(5, 11) });
    }
    if (rng.bool(0.35)) {
      const u = rng.range(rect.u0 + 0.1, rect.u1 - 0.1), t = rng.range(rect.t0 + 0.1, rect.t1 - 0.1);
      cell.decor.push({ type: 'pond', p: cell.map(u, t), r: rng.range(14, 30) });
    }
  }

  function makeField(cell, rect, W, H, rng) {
    const rows = Math.max(2, Math.round((H * (rect.t1 - rect.t0)) / rng.range(14, 26)));
    for (let i = 1; i < rows; i++) {
      const t = lerp(rect.t0, rect.t1, i / rows);
      const line = [];
      for (let s = 0; s <= 6; s++) line.push(cell.map(lerp(rect.u0, rect.u1, s / 6), t));
      cell.decor.push({ type: 'row', line });
    }
  }

  function addPlazaDecor(cell, area, W, H, rng) {
    const u = (area.u0 + area.u1) / 2, t = (area.t0 + area.t1) / 2;
    cell.decor.push({ type: 'fountain', p: cell.map(u, t), r: rng.range(10, 18) });
    const n = rng.int(4, 9);
    for (let i = 0; i < n; i++) {
      cell.decor.push({
        type: 'tree',
        p: cell.map(rng.range(area.u0, area.u1), rng.range(area.t0, area.t1)),
        r: rng.range(6, 10),
      });
    }
  }

  /* --------------------------------------------------------------------- */
  /* Центр города                                                           */
  /* --------------------------------------------------------------------- */

  function buildCore(city) {
    const rng = CM.rngFor(city.params.seed, 'core:' + city.core.type);
    const core = city.core;
    core.buildings = [];
    core.decor = [];
    const r0 = city.rings[0].r * 0.62;
    if (core.type === 'citadel') {
      const a = rng.range(0, TAU);
      const w = r0 * rng.range(0.75, 1.05), h = r0 * rng.range(0.6, 0.95);
      core.buildings.push({
        poly: rotRect([0, 0], w, h, a), c: [0, 0], area: w * h, floors: rng.int(4, 7),
        tone: 'civic', shade: 0, pop: Math.round(w * h * 0.01),
      });
      const towers = rng.int(3, 5);
      for (let i = 0; i < towers; i++) {
        const t = a + (i / towers) * TAU;
        core.decor.push({ type: 'tower', p: [Math.cos(t) * r0 * 0.95, Math.sin(t) * r0 * 0.95], r: rng.range(9, 14) });
      }
    } else {
      core.decor.push({ type: 'fountain', p: [0, 0], r: r0 * rng.range(0.2, 0.32) });
      const n = rng.int(5, 9);
      const step = TAU / n;
      const spin = rng.range(0, TAU);
      for (let i = 0; i < n; i++) {
        // равномерно по кругу — иначе постройки налезают друг на друга
        const t = spin + step * i + rng.range(-step * 0.18, step * 0.18);
        const rr = r0 * rng.range(0.72, 0.9);
        const chord = 2 * rr * Math.sin(step / 2);
        const w = Math.min(chord * 0.8, rng.range(18, 34));
        const h = Math.min(r0 * 0.32, rng.range(14, 26));
        const p = [Math.cos(t) * rr, Math.sin(t) * rr];
        core.buildings.push({
          poly: rotRect(p, w, h, t + Math.PI / 2), c: p, area: w * h, floors: rng.int(2, 4),
          tone: 'civic', shade: rng.int(0, 3), pop: Math.round(w * h * 0.02),
        });
      }
      for (let i = 0; i < 6; i++) {
        const t = rng.range(0, TAU);
        core.decor.push({ type: 'tree', p: [Math.cos(t) * r0 * 1.05, Math.sin(t) * r0 * 1.05], r: rng.range(6, 10) });
      }
    }
  }

  function rotRect(c, w, h, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    return pts.map((p) => [c[0] + p[0] * ca - p[1] * sa, c[1] + p[0] * sa + p[1] * ca]);
  }

  /* --------------------------------------------------------------------- */
  /* Дороги, стены, мосты                                                   */
  /* --------------------------------------------------------------------- */

  function buildRoads(city) {
    const ringLines = [];
    for (let i = 0; i <= city.ringsN; i++) {
      const pts = [];
      for (let s = 0; s <= 240; s++) {
        const th = (s / 240) * TAU;
        const r = ringRadius(city.rings[i], th);
        pts.push([Math.cos(th) * r, Math.sin(th) * r]);
      }
      ringLines.push({ pts, index: i, wall: i === city.K, rank: i === city.K ? 2 : 1 });
    }

    const radialLines = [];
    const maxGt = city.ringsN / city.K;
    for (const rad of city.radials) {
      const pts = [];
      const steps = 90;
      for (let s = 0; s <= steps; s++) {
        const gt = (s / steps) * maxGt;
        const th = radialAngle(rad, gt);
        const r = radiusAtNorm(city, gt, th);
        pts.push([Math.cos(th) * r, Math.sin(th) * r]);
      }
      radialLines.push({ pts, main: rad.main });
    }

    // ворота и башни на стене
    const gates = [];
    const towers = [];
    const wall = city.rings[city.K];
    for (const rad of city.radials) {
      const th = radialAngle(rad, 1);
      const r = ringRadius(wall, th);
      gates.push({ p: [Math.cos(th) * r, Math.sin(th) * r], a: th, main: rad.main });
    }
    const towerCount = Math.max(10, city.radials.length * 3);
    for (let i = 0; i < towerCount; i++) {
      const th = (i / towerCount) * TAU;
      const r = ringRadius(wall, th);
      towers.push({ p: [Math.cos(th) * r, Math.sin(th) * r], r: 11 });
    }

    city.roads = { rings: ringLines, radials: radialLines };
    city.wall = { pts: ringLines[city.K].pts, gates, towers };
  }

  function buildBridges(city) {
    city.bridges = [];
    if (!city.river) return;
    const half = city.river.width * 0.5;

    /** Находит участки дороги, идущие по воде, и ставит там мосты. */
    function scan(pts, width) {
      let i = 1;
      while (i < pts.length) {
        const prevWet = city.riverDist(pts[i - 1]) <= half;
        const wet = city.riverDist(pts[i]) <= half;
        if (!prevWet && wet) {
          let j = i;
          while (j < pts.length - 1 && city.riverDist(pts[j]) <= half) j++;
          const a = pts[i - 1], b = pts[Math.min(j, pts.length - 1)];
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          let tooClose = false; // рядом стоящие переправы сливаются в одну
          for (const other of city.bridges) if (G.dist(other.p, mid) < 70) { tooClose = true; break; }
          if (!tooClose && Math.hypot(mid[0], mid[1]) < R * 1.2) {
            city.bridges.push({
              p: mid,
              a: Math.atan2(b[1] - a[1], b[0] - a[0]),
              len: G.dist(a, b) + 20,
              w: width,
            });
          }
          i = j + 1;
        } else {
          i++;
        }
      }
    }

    for (const r of city.roads.radials) scan(r.pts, r.main ? 17 : 12);
    for (const r of city.roads.rings) if (!r.wall) scan(r.pts, 13);
  }

  /* --------------------------------------------------------------------- */
  /* Главная функция                                                        */
  /* --------------------------------------------------------------------- */

  function generateCity(userParams) {
    const params = Object.assign({}, DEFAULTS, userParams || {});
    params.overrides = Object.assign({}, params.overrides || {});
    const seed = String(params.seed || 'CITY');
    const rng = CM.rngFor(seed, 'layout');
    const modern = params.era === 'modern';
    const irr = G.clamp(params.irregularity, 0, 1);

    const K = G.clamp(Math.round(params.rings), 2, 8);
    const nRad = G.clamp(Math.round(params.radials), 3, 20);

    const city = {
      params, seed, R, K,
      name: CM.cityName(seed),
      rings: [], radials: [], cells: [], core: null,
    };

    // --- кольца ---
    const ringsTotal = params.outskirts ? K + 1 : K;
    for (let i = 0; i <= ringsTotal; i++) {
      let r;
      if (i <= K) {
        const f = Math.pow(i / K, 1.12);
        r = R * (0.085 + 0.915 * f) * (1 + rng.range(-0.03, 0.03) * (i > 0 && i < K ? 1 : 0));
      } else {
        r = R * rng.range(1.14, 1.22);
      }
      const harm = [];
      const hCount = modern ? 2 : 3;
      for (let h = 0; h < hCount; h++) {
        harm.push({
          k: rng.int(2, 5),
          a: irr * rng.range(0.012, 0.055) * (modern ? 0.45 : 1) * (i === 0 ? 0.5 : 1),
          p: rng.range(0, TAU),
        });
      }
      city.rings.push({ r, harm, index: i });
    }
    city.ringsN = city.rings.length - 1;

    // --- радиальные проспекты ---
    const step = TAU / nRad;
    const jitterA = step * 0.3 * irr * (modern ? 0.3 : 1);
    const start = rng.range(0, TAU);
    for (let j = 0; j < nRad; j++) {
      city.radials.push({
        a: start + j * step + rng.range(-jitterA, jitterA),
        amp: irr * rng.range(-0.07, 0.07) * (modern ? 0.3 : 1),
        main: j % 2 === 0 || nRad < 6,
        index: j,
      });
    }
    city.radials.sort((a, b) => a.a - b.a);
    city.radials.forEach((r, j) => { r.index = j; });

    // --- река ---
    city.river = params.river ? makeRiver(seed, CM.rngFor(seed, 'river')) : null;
    city.riverDist = makeRiverTest(city.river);

    // --- дороги и стены ---
    buildRoads(city);
    buildBridges(city);

    // --- ячейки ---
    const cellRows = params.outskirts ? K + 1 : K;
    for (let i = 0; i < cellRows; i++) {
      for (let j = 0; j < nRad; j++) {
        const map = makeCellMap(city, i, j);
        const cell = { i, j, map, key: i + ',' + j };
        const p00 = map(0, 0.5), p10 = map(1, 0.5), p01 = map(0.5, 0), p11 = map(0.5, 1);
        cell.W = Math.max(12, G.dist(p00, p10));
        cell.H = Math.max(12, G.dist(p01, p11));
        const mainRoad = (modern ? 15 : 11);
        cell.marginU = mainRoad / 2 + (i >= K ? 4 : 0);
        cell.marginT = (params.walls && (i === K - 1 || i === K)) ? 16 : mainRoad / 2;
        cell.outline = rectPoly(map, { u0: 0, u1: 1, t0: 0, t1: 1 }, 12, 4);
        cell.center = G.polyCentroid(cell.outline);
        cell.outside = i >= K;

        // насколько квартал задет рекой
        cell.riverFrac = 0;
        if (city.river) {
          let hits = 0, tot = 0;
          for (let a = 0; a <= 3; a++) {
            for (let b = 0; b <= 3; b++) {
              tot++;
              if (city.riverDist(map(a / 3, b / 3)) < city.river.width * 0.5 + 40) hits++;
            }
          }
          cell.riverFrac = hits / tot;
        }

        const dRng = CM.rngFor(seed, 'district:' + i + ':' + j);
        cell.autoType = autoDistrict(city, cell, dRng);
        cell.type = params.overrides[cell.key] || cell.autoType;
        city.cells.push(cell);
      }
    }

    // --- центр ---
    const coreRng = CM.rngFor(seed, 'coretype');
    const coreType = params.overrides['core'] ||
      (params.era === 'modern' ? coreRng.weighted([['plaza', 6], ['citadel', 2]])
        : coreRng.weighted([['citadel', 5], ['plaza', 4]]));
    const corePoly = [];
    for (let s = 0; s < 96; s++) {
      const th = (s / 96) * TAU;
      const r = ringRadius(city.rings[0], th);
      corePoly.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    city.usedNames = new Set();
    for (const cell of city.cells) cell.label = nameQuarter(city, cell);

    city.core = { i: -1, j: 0, key: 'core', type: coreType, autoType: coreType, outline: corePoly, center: [0, 0] };
    city.core.label = nameQuarter(city, city.core);
    buildCore(city);

    // --- застройка ---
    for (const cell of city.cells) fillCell(city, cell);

    computeStats(city);
    return city;
  }

  const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];

  /** Подбирает кварталу название, не повторяющееся в этом городе. */
  function nameQuarter(city, cell) {
    const base = CM.quarterName(city.seed, cell.i, cell.j, cell.type);
    for (let n = 0; n < ROMAN.length; n++) {
      const name = base + ROMAN[n];
      if (!city.usedNames.has(name)) { city.usedNames.add(name); return name; }
    }
    return base;
  }

  /** Пересобирает один квартал после смены типа (для «конструктора»). */
  function setCellType(city, cell, type) {
    cell.type = type;
    if (cell.label) city.usedNames.delete(cell.label);
    cell.label = nameQuarter(city, cell);
    if (cell.key === 'core') {
      city.core.type = type === 'plaza' || type === 'citadel' ? type : 'plaza';
      buildCore(city);
    } else {
      fillCell(city, cell);
    }
    if (type === cell.autoType) delete city.params.overrides[cell.key];
    else city.params.overrides[cell.key] = type;
    computeStats(city);
  }

  function computeStats(city) {
    let buildings = 0, pop = 0, built = 0;
    const byType = {};
    const scan = (c) => {
      for (const b of c.buildings) { buildings++; pop += b.pop; built += b.area * b.floors; }
      byType[c.type] = (byType[c.type] || 0) + 1;
    };
    for (const c of city.cells) scan(c);
    scan(city.core);
    const wallArea = G.polyArea(city.wall.pts) / 1e6; // км²
    city.stats = {
      buildings, population: pop, byType,
      areaKm2: wallArea,
      floorArea: built,
      quarters: city.cells.length + 1,
    };
  }

  CM.DISTRICTS = DISTRICTS;
  CM.DISTRICT_ORDER = DISTRICT_ORDER;
  CM.DEFAULTS = DEFAULTS;
  CM.CITY_R = R;
  CM.generateCity = generateCity;
  CM.setCellType = setCellType;
  CM.ringRadius = ringRadius;
  CM.radialAngle = radialAngle;
})(window);
