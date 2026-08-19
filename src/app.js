/* app.js — интерфейс: параметры, камера, редактирование кварталов, экспорт. */
(function (global) {
  'use strict';
  const CM = global.CM;
  const G = CM.G;
  const $ = (id) => document.getElementById(id);

  const canvas = $('map');
  const ctx = canvas.getContext('2d');

  const state = {
    params: Object.assign({}, CM.DEFAULTS, { seed: CM.randomSeed(), overrides: {} }),
    city: null,
    view: { x: 0, y: 0, scale: 0.3 },
    style: 'parchment',
    showLabels: true,
    showDistricts: false,
    brush: null,          // выбранный тип квартала или null (режим осмотра)
    hover: null,
    undo: [],
    version: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };

  /* ------------------------------------------------------------------ */
  /* Ссылка (hash) — город целиком помещается в URL                       */
  /* ------------------------------------------------------------------ */

  const ORDER = CM.DISTRICT_ORDER;

  function encodeHash() {
    const p = state.params;
    const ov = Object.keys(p.overrides).map((k) => {
      const ti = ORDER.indexOf(p.overrides[k]);
      if (ti < 0) return null;
      return (k === 'core' ? 'c.0' : k.replace(',', '.')) + '.' + ti;
    }).filter(Boolean).join('_');
    const parts = [
      's=' + encodeURIComponent(p.seed),
      'e=' + p.era,
      'r=' + p.rings,
      'a=' + p.radials,
      'i=' + Math.round(p.irregularity * 100),
      'd=' + Math.round(p.density * 100),
      'p=' + Math.round(p.parks * 100),
      'w=' + (p.river ? 1 : 0),
      'l=' + (p.walls ? 1 : 0),
      'o=' + (p.outskirts ? 1 : 0),
      'y=' + state.style,
    ];
    if (ov) parts.push('v=' + ov);
    return '#' + parts.join('&');
  }

  function decodeHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return false;
    const q = {};
    for (const kv of h.split('&')) {
      const i = kv.indexOf('=');
      if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    }
    if (!q.s) return false;
    const p = state.params;
    p.seed = q.s;
    if (q.e) p.era = q.e === 'modern' ? 'modern' : 'medieval';
    if (q.r) p.rings = +q.r;
    if (q.a) p.radials = +q.a;
    if (q.i) p.irregularity = +q.i / 100;
    if (q.d) p.density = +q.d / 100;
    if (q.p) p.parks = +q.p / 100;
    if (q.w !== undefined) p.river = q.w === '1';
    if (q.l !== undefined) p.walls = q.l === '1';
    if (q.o !== undefined) p.outskirts = q.o === '1';
    if (q.y && CM.STYLES[q.y]) state.style = q.y;
    p.overrides = {};
    if (q.v) {
      for (const item of q.v.split('_')) {
        const m = item.split('.');
        if (m.length !== 3) continue;
        const type = ORDER[+m[2]];
        if (!type) continue;
        p.overrides[m[0] === 'c' ? 'core' : m[0] + ',' + m[1]] = type;
      }
    }
    return true;
  }

  let hashTimer = null;
  function syncHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      history.replaceState(null, '', encodeHash());
    }, 250);
  }

  /* ------------------------------------------------------------------ */
  /* Камера                                                              */
  /* ------------------------------------------------------------------ */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * state.dpr));
    canvas.height = Math.max(1, Math.round(rect.height * state.dpr));
    state.w = rect.width;
    state.h = rect.height;
    draw();
  }

  function fitView() {
    const span = CM.CITY_R * 2.5;
    const s = Math.min(state.w / span, state.h / span);
    state.view.scale = s;
    state.view.x = state.w / 2;
    state.view.y = state.h / 2;
  }

  function screenToWorld(px, py) {
    return [(px - state.view.x) / state.view.scale, (py - state.view.y) / state.view.scale];
  }

  /* ------------------------------------------------------------------ */
  /* Генерация и отрисовка                                               */
  /* ------------------------------------------------------------------ */

  let pending = false;
  function draw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!state.city) return;
      CM.render(ctx, state.city, {
        view: state.view,
        style: state.style,
        showLabels: state.showLabels,
        showDistricts: state.showDistricts,
        hover: state.hover,
        width: state.w,
        height: state.h,
        dpr: state.dpr,
      });
    });
  }

  function generate(keepView) {
    const t0 = performance.now();
    state.city = CM.generateCity(state.params);
    // генератор работает с собственной копией параметров — переключаемся на неё,
    // чтобы ручные правки кварталов попадали в один и тот же объект
    state.params = state.city.params;
    state.city.version = ++state.version;
    state.hover = null;
    state.undo.length = 0;
    if (!keepView) fitView();
    $('cityName').textContent = state.city.name;
    updateStats();
    updateEditCount();
    syncHash();
    draw();
    return performance.now() - t0;
  }

  function updateStats() {
    const st = state.city.stats;
    $('stPop').textContent = st.population.toLocaleString('ru-RU');
    $('stBuildings').textContent = st.buildings.toLocaleString('ru-RU');
    $('stArea').textContent = st.areaKm2.toFixed(2) + ' км²';
    $('stQuarters').textContent = st.quarters;
  }

  function updateEditCount() {
    $('editCount').textContent = Object.keys(state.params.overrides).length;
  }

  /* ------------------------------------------------------------------ */
  /* Поиск квартала под курсором                                         */
  /* ------------------------------------------------------------------ */

  function cellAt(wx, wy) {
    const city = state.city;
    if (!city) return null;
    const p = [wx, wy];
    if (G.pointInPolygon(p, city.core.outline)) return city.core;
    const rMax = city.rings[city.ringsN].r * 1.3;
    if (wx * wx + wy * wy > rMax * rMax) return null;
    for (const c of city.cells) if (G.pointInPolygon(p, c.outline)) return c;
    return null;
  }

  function paint(cell, type) {
    if (!cell) return;
    if (type === 'auto') type = cell.autoType || (cell.key === 'core' ? 'plaza' : 'residential');
    const prev = cell.type;
    if (prev === type) return;
    state.undo.push({ key: cell.key, type: prev, wasOverride: !!state.params.overrides[cell.key] });
    if (state.undo.length > 60) state.undo.shift();
    CM.setCellType(state.city, cell, type);
    state.city.version = ++state.version;
    updateStats();
    updateEditCount();
    syncHash();
    draw();
  }

  function undo() {
    const step = state.undo.pop();
    if (!step) { toast('Нечего отменять'); return; }
    const cell = step.key === 'core' ? state.city.core
      : state.city.cells.find((c) => c.key === step.key);
    if (!cell) return;
    CM.setCellType(state.city, cell, step.type);
    if (!step.wasOverride) delete state.params.overrides[cell.key];
    state.city.version = ++state.version;
    updateStats();
    updateEditCount();
    syncHash();
    draw();
  }

  /* ------------------------------------------------------------------ */
  /* Мышь, тач, колесо                                                   */
  /* ------------------------------------------------------------------ */

  const pointers = new Map();
  let dragged = 0, lastPinch = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = 0;
    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const prev = pointers.get(e.pointerId);

    if (prev && pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      dragged += Math.abs(dx) + Math.abs(dy);
      state.view.x += dx;
      state.view.y += dy;
      prev.x = e.clientX; prev.y = e.clientY;
      hideTip();
      draw();
      return;
    }
    if (prev && pointers.size === 2) {
      prev.x = e.clientX; prev.y = e.clientY;
      const [a, b] = Array.from(pointers.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch > 0) {
        const cx = (a.x + b.x) / 2 - rect.left, cy = (a.y + b.y) / 2 - rect.top;
        zoomAt(cx, cy, d / lastPinch);
      }
      lastPinch = d;
      dragged += 10;
      return;
    }

    // наведение
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const w = screenToWorld(px, py);
    const cell = cellAt(w[0], w[1]);
    if (cell !== state.hover) {
      state.hover = cell;
      draw();
    }
    if (cell) showTip(px, py, cell);
    else hideTip();
  });

  function endPointer(e) {
    const had = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    canvas.classList.remove('dragging');
    if (!had || dragged > 6 || e.button === 2) return;
    const rect = canvas.getBoundingClientRect();
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const cell = cellAt(w[0], w[1]);
    if (!cell) return;
    if (state.brush) paint(cell, state.brush);
    else toast(cell.label + ' · ' + (CM.DISTRICTS[cell.type] || {}).title);
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const cell = cellAt(w[0], w[1]);
    if (cell) paint(cell, cell.autoType || (cell.key === 'core' ? 'plaza' : 'residential'));
  });

  function zoomAt(px, py, k) {
    const v = state.view;
    const ns = G.clamp(v.scale * k, 0.06, 8);
    const f = ns / v.scale;
    v.x = px - (px - v.x) * f;
    v.y = py - (py - v.y) * f;
    v.scale = ns;
    draw();
  }

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  /* ------------------------------------------------------------------ */
  /* Подсказки                                                           */
  /* ------------------------------------------------------------------ */

  const tip = $('tip');
  function showTip(x, y, cell) {
    const d = CM.DISTRICTS[cell.type];
    tip.textContent = cell.label + ' — ' + (d ? d.title.toLowerCase() : cell.type);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.classList.add('show');
  }
  function hideTip() { tip.classList.remove('show'); }

  let toastTimer = null;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  /* ------------------------------------------------------------------ */
  /* Панель управления                                                   */
  /* ------------------------------------------------------------------ */

  function buildStyleSelect() {
    const sel = $('style');
    sel.innerHTML = '';
    for (const key of Object.keys(CM.STYLES)) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = CM.STYLES[key].title;
      sel.appendChild(o);
    }
    sel.value = state.style;
  }

  function buildBrush() {
    const box = $('brush');
    box.innerHTML = '';
    const items = [['auto', 'Авто', '#8a94a6']].concat(
      CM.DISTRICT_ORDER.map((t) => [t, CM.DISTRICTS[t].title, CM.DISTRICT_TINT[t] || '#888'])
    );
    for (const [type, title, color] of items) {
      const b = document.createElement('button');
      b.dataset.type = type;
      b.style.color = color;
      b.innerHTML = '<i></i><span></span>';
      b.querySelector('span').textContent = title;
      b.querySelector('span').style.color = 'var(--text)';
      b.addEventListener('click', () => {
        state.brush = state.brush === type ? null : type;
        syncBrushUI();
      });
      box.appendChild(b);
    }
    syncBrushUI();
  }

  function syncBrushUI() {
    for (const b of $('brush').children) b.classList.toggle('active', b.dataset.type === state.brush);
    canvas.classList.toggle('painting', !!state.brush);
  }

  function applyParamsToUI() {
    const p = state.params;
    $('seed').value = p.seed;
    $('era').value = p.era;
    $('rings').value = p.rings; $('ringsVal').textContent = p.rings;
    $('radials').value = p.radials; $('radialsVal').textContent = p.radials;
    $('irr').value = Math.round(p.irregularity * 100); $('irrVal').textContent = Math.round(p.irregularity * 100);
    $('dens').value = Math.round(p.density * 100); $('densVal').textContent = Math.round(p.density * 100);
    $('parks').value = Math.round(p.parks * 100); $('parksVal').textContent = Math.round(p.parks * 100);
    $('river').checked = p.river;
    $('walls').checked = p.walls;
    $('outskirts').checked = p.outskirts;
    $('labels').checked = state.showLabels;
    $('tint').checked = state.showDistricts;
    $('style').value = state.style;
  }

  let regenTimer = null;
  function regenSoon(keepView) {
    clearTimeout(regenTimer);
    regenTimer = setTimeout(() => generate(keepView !== false), 90);
  }

  function bindControls() {
    $('btnRandom').addEventListener('click', () => {
      state.params.seed = CM.randomSeed();
      state.params.overrides = {};
      $('seed').value = state.params.seed;
      generate(true);
      toast('Новый город: ' + state.city.name);
    });
    $('btnReroll').addEventListener('click', () => generate(true));

    $('seed').addEventListener('change', () => {
      state.params.seed = $('seed').value.trim() || CM.randomSeed();
      $('seed').value = state.params.seed;
      generate(true);
    });

    $('era').addEventListener('change', () => { state.params.era = $('era').value; regenSoon(); });

    const sliders = [
      ['rings', 'ringsVal', (v) => { state.params.rings = +v; return v; }],
      ['radials', 'radialsVal', (v) => { state.params.radials = +v; return v; }],
      ['irr', 'irrVal', (v) => { state.params.irregularity = +v / 100; return v; }],
      ['dens', 'densVal', (v) => { state.params.density = +v / 100; return v; }],
      ['parks', 'parksVal', (v) => { state.params.parks = +v / 100; return v; }],
    ];
    for (const [id, label, apply] of sliders) {
      $(id).addEventListener('input', (e) => {
        $(label).textContent = apply(e.target.value);
        regenSoon();
      });
    }

    for (const id of ['river', 'walls', 'outskirts']) {
      $(id).addEventListener('change', (e) => { state.params[id] = e.target.checked; regenSoon(); });
    }

    $('style').addEventListener('change', (e) => { state.style = e.target.value; syncHash(); draw(); });
    $('labels').addEventListener('change', (e) => { state.showLabels = e.target.checked; draw(); });
    $('tint').addEventListener('change', (e) => { state.showDistricts = e.target.checked; draw(); });

    $('btnClearEdits').addEventListener('click', () => {
      if (!Object.keys(state.params.overrides).length) { toast('Правок нет'); return; }
      state.params.overrides = {};
      generate(true);
      toast('Ручные правки сброшены');
    });
    $('btnUndo').addEventListener('click', undo);

    $('btnPng').addEventListener('click', exportPng);
    $('btnJson').addEventListener('click', exportJson);
    $('btnLoad').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', importJson);
    $('btnLink').addEventListener('click', copyLink);

    $('panelToggle').addEventListener('click', () => {
      $('panel').classList.toggle('hidden');
      setTimeout(resize, 30);
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        state.params.seed = CM.randomSeed();
        state.params.overrides = {};
        $('seed').value = state.params.seed;
        generate(true);
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        fitView(); draw();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я')) {
        e.preventDefault(); undo();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Экспорт                                                             */
  /* ------------------------------------------------------------------ */

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportPng() {
    const size = 2000;
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const octx = off.getContext('2d');
    const span = CM.CITY_R * 2.6;
    CM.render(octx, state.city, {
      view: { x: size / 2, y: size / 2, scale: size / span },
      style: state.style,
      showLabels: state.showLabels,
      showDistricts: state.showDistricts,
      hover: null,
      width: size, height: size, dpr: 1,
    });
    off.toBlob((blob) => {
      download(blob, 'map-' + state.city.name + '-' + state.params.seed + '.png');
      toast('PNG сохранён');
    }, 'image/png');
  }

  function exportJson() {
    const data = {
      format: 'city-map-constructor/1',
      name: state.city.name,
      params: state.params,
      style: state.style,
      stats: state.city.stats,
      link: location.origin + location.pathname + encodeHash(),
    };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 
      'city-' + state.params.seed + '.json');
    toast('JSON сохранён');
  }

  function importJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.params) throw new Error('нет параметров');
        state.params = Object.assign({}, CM.DEFAULTS, data.params);
        state.params.overrides = Object.assign({}, data.params.overrides || {});
        if (data.style && CM.STYLES[data.style]) state.style = data.style;
        applyParamsToUI();
        generate();
        toast('Загружено: ' + state.city.name);
      } catch (err) {
        toast('Не удалось прочитать файл');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function copyLink() {
    history.replaceState(null, '', encodeHash());
    const url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast('Ссылка скопирована'),
        () => toast('Ссылка — в адресной строке')
      );
    } else {
      toast('Ссылка — в адресной строке');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Запуск                                                              */
  /* ------------------------------------------------------------------ */

  function init() {
    decodeHash();
    buildStyleSelect();
    buildBrush();
    applyParamsToUI();
    bindControls();
    resize();
    generate();
    window.addEventListener('resize', resize);
    window.addEventListener('hashchange', () => {
      if (encodeHash() === location.hash) return;
      if (decodeHash()) { applyParamsToUI(); buildStyleSelect(); generate(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.CityApp = state;
})(window);
