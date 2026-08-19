/* render.js — отрисовка города на canvas в разных стилях. */
(function (global) {
  'use strict';
  const CM = (global.CM = global.CM || {});
  const G = CM.G;
  const TAU = G.TAU;

  const STYLES = {
    parchment: {
      title: 'Пергамент',
      bg: '#d3bf99', outer: '#e2d3ac', ground: '#eaddbd', vignette: 'rgba(90,70,40,0.28)',
      road: '#f7f0dc', roadEdge: 'rgba(120,95,60,0.30)',
      water: '#9cbcc8', waterDeep: '#86aab9', waterEdge: 'rgba(60,95,110,0.45)',
      park: '#c3cfa0', forest: '#aebd8b', tree: '#8fa878', treeEdge: '#6e8a5b', pond: '#9cbcc8',
      field: '#e5d6a4', fieldLine: 'rgba(140,118,70,0.35)',
      wall: '#9a7a55', wallEdge: '#5d4530', tower: '#a9885f',
      ink: '#59452f', inkSoft: 'rgba(89,69,47,0.6)',
      shadow: 'rgba(95,72,45,0.22)', shadowOff: 3,
      tones: {
        old:   { fills: ['#c9a67c', '#c09b70', '#d1b089', '#b99266'], stroke: '#7b5a39' },
        house: { fills: ['#d3b58d', '#cbab80', '#dabf9b', '#c5a377'], stroke: '#82603d' },
        trade: { fills: ['#d0a878', '#c99f6c', '#d9b689', '#c29a66'], stroke: '#7d5836' },
        civic: { fills: ['#c6b5a4', '#cfbcaa', '#bba796', '#d3c3b3'], stroke: '#6d5a48' },
        work:  { fills: ['#bba995', '#b09e88', '#c5b5a2', '#a89b8c'], stroke: '#71614e' },
      },
      glow: null,
    },
    blueprint: {
      title: 'Чертёж',
      bg: '#0a2338', outer: '#0d2b43', ground: '#11334f', vignette: 'rgba(0,10,20,0.45)',
      road: '#3d7fae', roadEdge: 'rgba(150,215,255,0.35)',
      water: '#0b3552', waterDeep: '#0a2c45', waterEdge: 'rgba(140,205,255,0.55)',
      park: '#123f52', forest: '#0f3446', tree: '#3f8d9e', treeEdge: '#61b4c4', pond: '#0b3552',
      field: '#123a52', fieldLine: 'rgba(140,205,255,0.25)',
      wall: '#8fd0ff', wallEdge: '#bfe6ff', tower: '#8fd0ff',
      ink: '#cfe9ff', inkSoft: 'rgba(190,225,255,0.65)',
      shadow: null, shadowOff: 0,
      tones: {
        old:   { fills: ['#17415f', '#1a4a6c', '#143a56', '#1d5075'], stroke: '#7fc8f5' },
        house: { fills: ['#164761', '#1a5070', '#123d55', '#1e5878'], stroke: '#7fc8f5' },
        trade: { fills: ['#194a68', '#1d5476', '#153f5b', '#215d80'], stroke: '#8ed2f8' },
        civic: { fills: ['#1d5476', '#225d81', '#194a68', '#276a90'], stroke: '#a7dcff' },
        work:  { fills: ['#143a56', '#173f5e', '#11334c', '#1a4664'], stroke: '#6fb8e6' },
      },
      glow: null,
    },
    night: {
      title: 'Ночь',
      bg: '#080a10', outer: '#101320', ground: '#181c28', vignette: 'rgba(0,0,0,0.55)',
      road: '#39435c', roadEdge: 'rgba(150,175,220,0.18)',
      water: '#0c1c2c', waterDeep: '#091625', waterEdge: 'rgba(110,160,205,0.35)',
      park: '#16241c', forest: '#111d16', tree: '#2c4534', treeEdge: '#3b5a45', pond: '#0c1c2c',
      field: '#1a2029', fieldLine: 'rgba(150,170,200,0.14)',
      wall: '#4b5773', wallEdge: '#6c7b9c', tower: '#5a6885',
      ink: '#cad4e8', inkSoft: 'rgba(190,205,230,0.55)',
      shadow: 'rgba(0,0,0,0.5)', shadowOff: 2,
      tones: {
        old:   { fills: ['#333b4f', '#3a4358', '#2d3546', '#404a61'], stroke: '#4e5a75' },
        house: { fills: ['#353d52', '#3d465c', '#2f374a', '#454f66'], stroke: '#525f7c' },
        trade: { fills: ['#3c4054', '#454a60', '#34384a', '#4d5369'], stroke: '#5a6382' },
        civic: { fills: ['#454b62', '#4d546d', '#3d4257', '#555d78'], stroke: '#6b7593' },
        work:  { fills: ['#2e3543', '#353d4d', '#282f3b', '#3b4455'], stroke: '#485164' },
      },
      glow: '#ffc978',
    },
    modern: {
      title: 'День',
      bg: '#dce2e6', outer: '#e6ece0', ground: '#e0e5e9', vignette: 'rgba(90,110,125,0.16)',
      road: '#ffffff', roadEdge: 'rgba(120,140,155,0.35)',
      water: '#a9cfe2', waterDeep: '#8ebdd4', waterEdge: 'rgba(90,140,170,0.5)',
      park: '#c4dcb1', forest: '#aecb99', tree: '#8dba78', treeEdge: '#6f9a5c', pond: '#a9cfe2',
      field: '#e3e2c2', fieldLine: 'rgba(140,140,100,0.35)',
      wall: '#b3bcc3', wallEdge: '#8d979f', tower: '#c2cad0',
      ink: '#3c4a55', inkSoft: 'rgba(60,74,85,0.6)',
      shadow: 'rgba(70,90,105,0.18)', shadowOff: 2.5,
      tones: {
        old:   { fills: ['#c9d0d6', '#c1c9d0', '#d2d8dd', '#bac3ca'], stroke: '#9aa5ad' },
        house: { fills: ['#ccd3d9', '#c4ccd3', '#d5dbe0', '#bcc5cc'], stroke: '#a2acb4' },
        trade: { fills: ['#d3cec6', '#cbc5bc', '#dcd8d1', '#c3bcb2'], stroke: '#a8a099' },
        civic: { fills: ['#dbdde0', '#d2d5d9', '#e3e5e8', '#c9ccd1'], stroke: '#a9aeb4' },
        work:  { fills: ['#c3c7c4', '#bbc0bd', '#ccd0cd', '#b3b8b5'], stroke: '#9aa09c' },
      },
      glow: null,
    },
  };

  const DISTRICT_TINT = {
    citadel: '#a8607a', plaza: '#c98f3f', temple: '#8f6fbf', oldtown: '#b5793c',
    market: '#d0a43a', residential: '#5f97c4', suburb: '#78a6a0', industrial: '#7a7a86',
    docks: '#4f8fa8', park: '#6aa55d', farm: '#b9a54a', forest: '#4f8551', water: '#4f7fa8',
  };

  /* ------------------------------------------------------------------ */

  function polyPath(ctx, poly, close) {
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    if (close !== false) ctx.closePath();
  }

  function strokePath(ctx, pts, closed) {
    ctx.beginPath();
    polyPath(ctx, pts, closed);
    ctx.stroke();
  }

  function fillPoly(ctx, poly, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    polyPath(ctx, poly, true);
    ctx.fill();
  }

  /** Группировка домов в Path2D по (тон, оттенок) — ускоряет отрисовку. */
  function buildingPaths(city) {
    if (city._paths && city._pathsVersion === city.version) return city._paths;
    const groups = new Map();
    const add = (cell) => {
      for (const b of cell.buildings) {
        const key = b.tone + ':' + b.shade;
        let g = groups.get(key);
        if (!g) { g = { tone: b.tone, shade: b.shade, path: new Path2D(), n: 0 }; groups.set(key, g); }
        const p = b.poly;
        g.path.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) g.path.lineTo(p[i][0], p[i][1]);
        g.path.closePath();
        g.n++;
      }
    };
    for (const c of city.cells) add(c);
    add(city.core);
    city._paths = Array.from(groups.values());
    city._pathsVersion = city.version;
    return city._paths;
  }

  /* ------------------------------------------------------------------ */

  function render(ctx, city, opts) {
    const st = STYLES[opts.style] || STYLES.parchment;
    const view = opts.view;
    const W = opts.width, H = opts.height;
    const s = view.scale;

    ctx.save();
    ctx.setTransform(opts.dpr, 0, 0, opts.dpr, 0, 0);
    ctx.fillStyle = st.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.translate(view.x, view.y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const lw = (px) => px / s; // толщина в экранных пикселях

    // --- земля ---
    fillPoly(ctx, ringPoly(city, city.ringsN), st.outer);
    fillPoly(ctx, city.wall.pts, st.ground);

    // --- подсветка типов кварталов ---
    if (opts.showDistricts) {
      ctx.globalAlpha = 0.22;
      for (const c of city.cells) fillPoly(ctx, c.outline, DISTRICT_TINT[c.type] || '#888');
      fillPoly(ctx, city.core.outline, DISTRICT_TINT[city.core.type] || '#888');
      ctx.globalAlpha = 1;
    }

    // --- зелень, поля, вода в кварталах ---
    for (const c of city.cells) drawCellGround(ctx, c, st);
    drawCellGround(ctx, city.core, st);

    // --- дороги ---
    drawRoads(ctx, city, st, lw, opts);

    // --- река ---
    if (city.river) drawRiver(ctx, city, st, lw);

    // --- водные кварталы (озёра, затоны) ---
    for (const c of city.cells) drawWaterCells(ctx, c, st);

    // --- мосты ---
    if (city.bridges && city.bridges.length) drawBridges(ctx, city, st, lw);

    // --- декор (деревья, поля, фонтаны) ---
    for (const c of city.cells) drawDecor(ctx, c, st, s);
    drawDecor(ctx, city.core, st, s);

    // --- дома ---
    drawBuildings(ctx, city, st, s, lw);

    // --- стены ---
    if (city.params.walls) drawWalls(ctx, city, st, lw);

    // --- выделение ---
    if (opts.hover) {
      ctx.strokeStyle = st.ink;
      ctx.lineWidth = lw(2);
      ctx.setLineDash([lw(8), lw(6)]);
      strokePath(ctx, opts.hover.outline, true);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); polyPath(ctx, opts.hover.outline, true); ctx.fill();
    }

    ctx.restore();

    // --- подписи и рамка (в экранных координатах) ---
    ctx.save();
    ctx.setTransform(opts.dpr, 0, 0, opts.dpr, 0, 0);
    if (st.vignette) drawVignette(ctx, W, H, st);
    if (opts.showLabels) drawLabels(ctx, city, st, view, opts);
    drawTitle(ctx, city, st, W);
    drawCompass(ctx, city, st, W, H, view);
    ctx.restore();
  }

  function ringPoly(city, i) {
    const pts = [];
    for (let s = 0; s <= 180; s++) {
      const th = (s / 180) * TAU;
      const r = CM.ringRadius(city.rings[i], th);
      pts.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    return pts;
  }

  function drawCellGround(ctx, cell, st) {
    if (!cell.blocks) return;
    for (const b of cell.blocks) {
      if (b.water) continue;
      if (b.kind === 'park') fillPoly(ctx, b.poly, st.park);
      else if (b.kind === 'forest') fillPoly(ctx, b.poly, st.forest || st.park);
      else if (b.kind === 'field') fillPoly(ctx, b.poly, st.field);
    }
  }

  function drawWaterCells(ctx, cell, st) {
    if (!cell.blocks) return;
    for (const b of cell.blocks) {
      if (b.kind !== 'water') continue;
      fillPoly(ctx, b.poly, st.water);
      ctx.strokeStyle = st.waterEdge;
      ctx.lineWidth = 3;
      strokePath(ctx, b.poly, true);
    }
  }

  function drawRoads(ctx, city, st, lw, opts) {
    // подложка (край дороги)
    const hideWallRing = !!city.params.walls;
    ctx.strokeStyle = st.roadEdge;
    for (const r of city.roads.rings) {
      if (r.wall && hideWallRing) continue;
      ctx.lineWidth = Math.max(lw(1.2), r.rank === 2 ? 15 : 11);
      strokePath(ctx, r.pts, true);
    }
    for (const r of city.roads.radials) {
      ctx.lineWidth = Math.max(lw(1.2), r.main ? 19 : 13);
      strokePath(ctx, r.pts, false);
    }
    // само полотно
    ctx.strokeStyle = st.road;
    for (const r of city.roads.rings) {
      if (r.wall && hideWallRing) continue;
      ctx.lineWidth = Math.max(lw(0.8), r.rank === 2 ? 12 : 8.5);
      strokePath(ctx, r.pts, true);
    }
    for (const r of city.roads.radials) {
      ctx.lineWidth = Math.max(lw(0.8), r.main ? 15.5 : 10);
      strokePath(ctx, r.pts, false);
    }
  }

  function drawRiver(ctx, city, st, lw) {
    const rv = city.river;
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.waterEdge;
    ctx.lineWidth = rv.width + Math.max(lw(1), 6);
    strokePath(ctx, rv.pts, false);
    ctx.strokeStyle = st.water;
    ctx.lineWidth = rv.width;
    strokePath(ctx, rv.pts, false);
    ctx.strokeStyle = st.waterDeep;
    ctx.lineWidth = rv.width * 0.45;
    strokePath(ctx, rv.pts, false);
  }

  function drawBridges(ctx, city, st, lw) {
    for (const b of city.bridges) {
      ctx.save();
      ctx.translate(b.p[0], b.p[1]);
      ctx.rotate(b.a);
      const L = b.len, Wd = b.w;
      ctx.fillStyle = st.road;
      ctx.strokeStyle = st.wallEdge;
      ctx.lineWidth = Math.max(lw(0.8), 2);
      ctx.beginPath();
      ctx.rect(-L / 2, -Wd / 2, L, Wd);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawDecor(ctx, cell, st, scale) {
    if (!cell.decor) return;
    const showTrees = scale > 0.16;
    for (const d of cell.decor) {
      if (d.type === 'row') {
        ctx.strokeStyle = st.fieldLine;
        ctx.lineWidth = 1.6;
        strokePath(ctx, d.line, false);
      } else if (d.type === 'tree') {
        if (!showTrees) continue;
        ctx.fillStyle = st.tree;
        ctx.strokeStyle = st.treeEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(d.p[0], d.p[1], d.r, 0, TAU);
        ctx.fill();
        if (scale > 0.5) ctx.stroke();
      } else if (d.type === 'pond') {
        ctx.fillStyle = st.pond;
        ctx.beginPath();
        ctx.arc(d.p[0], d.p[1], d.r, 0, TAU);
        ctx.fill();
      } else if (d.type === 'fountain') {
        ctx.fillStyle = st.pond;
        ctx.strokeStyle = st.wallEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.p[0], d.p[1], d.r, 0, TAU);
        ctx.fill(); ctx.stroke();
      } else if (d.type === 'tower') {
        ctx.fillStyle = st.tower;
        ctx.strokeStyle = st.wallEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.p[0], d.p[1], d.r, 0, TAU);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  function drawBuildings(ctx, city, st, scale, lw) {
    const groups = buildingPaths(city);
    // тени
    if (st.shadow && scale > 0.12) {
      ctx.save();
      ctx.translate(st.shadowOff, st.shadowOff);
      ctx.fillStyle = st.shadow;
      for (const g of groups) ctx.fill(g.path);
      ctx.restore();
    }
    for (const g of groups) {
      const tone = st.tones[g.tone] || st.tones.house;
      ctx.fillStyle = tone.fills[g.shade % tone.fills.length];
      ctx.fill(g.path);
    }
    if (scale > 0.22) {
      ctx.lineWidth = Math.max(lw(0.7), 0.7);
      for (const g of groups) {
        const tone = st.tones[g.tone] || st.tones.house;
        ctx.strokeStyle = tone.stroke;
        ctx.stroke(g.path);
      }
    }
    // окна ночью
    if (st.glow && scale > 0.55) {
      ctx.fillStyle = st.glow;
      ctx.globalAlpha = 0.75;
      const rng = CM.rngFor(city.seed, 'windows');
      const draw = (cell) => {
        for (const b of cell.buildings) {
          if (b.area < 60 || !rng.bool(0.35)) continue;
          ctx.beginPath();
          ctx.arc(b.c[0], b.c[1], Math.min(2.4, Math.sqrt(b.area) * 0.09), 0, TAU);
          ctx.fill();
        }
      };
      for (const c of city.cells) draw(c);
      draw(city.core);
      ctx.globalAlpha = 1;
    }
  }

  function drawWalls(ctx, city, st, lw) {
    const w = city.wall;
    ctx.strokeStyle = st.wallEdge;
    ctx.lineWidth = Math.max(lw(2), 16);
    strokePath(ctx, w.pts, true);
    ctx.strokeStyle = st.wall;
    ctx.lineWidth = Math.max(lw(1.2), 11);
    strokePath(ctx, w.pts, true);
    ctx.fillStyle = st.tower;
    ctx.strokeStyle = st.wallEdge;
    ctx.lineWidth = Math.max(lw(0.8), 2);
    for (const t of w.towers) {
      ctx.beginPath();
      ctx.arc(t.p[0], t.p[1], t.r, 0, TAU);
      ctx.fill(); ctx.stroke();
    }
    // ворота — разрывы стены
    for (const g of w.gates) {
      ctx.save();
      ctx.translate(g.p[0], g.p[1]);
      ctx.rotate(g.a);
      ctx.fillStyle = st.road;
      const gw = g.main ? 22 : 15;
      ctx.fillRect(-9, -gw / 2, 18, gw);
      ctx.restore();
    }
  }

  function drawVignette(ctx, W, H, st) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, st.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawLabels(ctx, city, st, view, opts) {
    const toScreen = (p) => [p[0] * view.scale + view.x, p[1] * view.scale + view.y];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (view.scale > 0.18) {
      ctx.font = '600 12px ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif';
      const all = city.cells.concat([city.core]);
      const placed = [];
      for (const c of all) {
        const p = toScreen(c.center);
        if (p[0] < -60 || p[1] < -30 || p[0] > opts.width + 60 || p[1] > opts.height + 30) continue;
        let ok = true;
        for (const q of placed) if (Math.abs(q[0] - p[0]) < 108 && Math.abs(q[1] - p[1]) < 24) { ok = false; break; }
        if (!ok) continue;
        placed.push(p);
        const text = c.label;
        const m = ctx.measureText(text);
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = st.bg;
        ctx.fillRect(p[0] - m.width / 2 - 5, p[1] - 9, m.width + 10, 18);
        ctx.globalAlpha = 1;
        ctx.fillStyle = st.ink;
        ctx.fillText(text, p[0], p[1]);
      }
    }

  }

  /** Название города — всегда в верхней части холста. */
  function drawTitle(ctx, city, st, W) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 30px "Iowan Old Style", Georgia, "Times New Roman", serif';
    const w = ctx.measureText(city.name).width;
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = st.bg;
    ctx.fillRect(W / 2 - w / 2 - 22, 12, w + 44, 56);
    ctx.globalAlpha = 1;
    ctx.fillStyle = st.ink;
    ctx.fillText(city.name, W / 2, 42);
    ctx.font = '400 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = st.inkSoft;
    ctx.fillText('зерно: ' + city.seed, W / 2, 60);
    ctx.restore();
  }

  function drawCompass(ctx, city, st, W, H, view) {
    const x = W - 58, y = H - 92;
    ctx.save();
    ctx.strokeStyle = st.inkSoft;
    ctx.fillStyle = st.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 26); ctx.lineTo(x - 6, y + 4); ctx.lineTo(x + 6, y + 4); ctx.closePath();
    ctx.fill();
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('С', x, y + 15);

    // масштабная линейка: 200 м
    const meters = 200;
    const px = meters * view.scale;
    if (px > 24 && px < W * 0.6) {
      const bx = W - 30 - px, by = H - 34;
      ctx.strokeStyle = st.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + px, by);
      ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5);
      ctx.moveTo(bx + px, by - 5); ctx.lineTo(bx + px, by + 5);
      ctx.stroke();
      ctx.fillStyle = st.ink;
      ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(meters + ' м', bx + px / 2, by - 10);
    }
    ctx.restore();
  }

  CM.STYLES = STYLES;
  CM.DISTRICT_TINT = DISTRICT_TINT;
  CM.render = render;
})(window);
