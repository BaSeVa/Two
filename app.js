(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const toastEl = document.getElementById("toast");

  const balanceEl = document.getElementById("balance");
  const themeSelect = document.getElementById("themeSelect");
  const betInput = document.getElementById("betInput");
  const betHalfBtn = document.getElementById("betHalf");
  const betDoubleBtn = document.getElementById("betDouble");
  const riskSelect = document.getElementById("riskSelect");
  const rowsRange = document.getElementById("rowsRange");
  const rowsValue = document.getElementById("rowsValue");
  const biasRange = document.getElementById("biasRange");
  const biasValue = document.getElementById("biasValue");
  const turboCheck = document.getElementById("turboCheck");
  const dropBtn = document.getElementById("dropBtn");
  const dropTenBtn = document.getElementById("dropTenBtn");
  const autoBtn = document.getElementById("autoBtn");
  const autoCount = document.getElementById("autoCount");
  const resetBtn = document.getElementById("resetBtn");
  const historyList = document.getElementById("historyList");
  const exportCsvBtn = document.getElementById("exportCsvBtn");

  const onLossSelect = document.getElementById("onLossSelect");
  const onWinSelect = document.getElementById("onWinSelect");
  const stratPct = document.getElementById("stratPct");
  const stopProfitInput = document.getElementById("stopProfit");
  const stopLossInput = document.getElementById("stopLoss");

  const statWagered = document.getElementById("statWagered");
  const statProfit = document.getElementById("statProfit");
  const statMax = document.getElementById("statMax");
  const statCount = document.getElementById("statCount");
  const statStreak = document.getElementById("statStreak");
  const statMaxStreak = document.getElementById("statMaxStreak");

  const achGrid = document.getElementById("achGrid");
  const achCount = document.getElementById("achCount");

  const pnlCanvas = document.getElementById("pnlCanvas");
  const pnlValueEl = document.getElementById("pnlValue");

  const seedHashOut = document.getElementById("seedHashOut");
  const clientSeedInput = document.getElementById("clientSeedInput");
  const nonceOut = document.getElementById("nonceOut");
  const rotateSeedBtn = document.getElementById("rotateSeedBtn");
  const revealedSeedsEl = document.getElementById("revealedSeeds");
  const fairnessDetails = document.getElementById("fairnessDetails");
  const vServerSeed = document.getElementById("vServerSeed");
  const vClientSeed = document.getElementById("vClientSeed");
  const vNonce = document.getElementById("vNonce");
  const vRisk = document.getElementById("vRisk");
  const vRows = document.getElementById("vRows");
  const vBias = document.getElementById("vBias");
  const verifyBtn = document.getElementById("verifyBtn");
  const verifyResult = document.getElementById("verifyResult");

  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;

  // ---------- prng / hashing ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(str) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      return "hash-unavailable-" + fnv1a(str).toString(16);
    }
  }

  // ---------- persistence ----------
  const STORAGE_KEY = "plinko-sim-state-v2";

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance: state.balance,
        risk: state.risk,
        rows: state.rows,
        bet: parseFloat(betInput.value) || 10,
        theme: state.theme,
        turbo: state.turbo,
        turboUsed: state.turboUsed,
        verifyUsed: state.verifyUsed,
        dropBias: state.dropBias,
        wagered: state.wagered,
        profit: state.profit,
        maxMult: state.maxMult,
        dropCount: state.dropCount,
        streak: state.streak,
        risksUsed: [...state.risksUsed],
        achievements: [...state.achievementsUnlocked],
        balanceHistory: state.balanceHistory.slice(-240),
        historyData: state.historyData.slice(0, 200),
        fairness: state.fairness,
        strategyForm: {
          onLoss: onLossSelect.value,
          onWin: onWinSelect.value,
          pct: stratPct.value,
          stopProfit: stopProfitInput.value,
          stopLoss: stopLossInput.value,
          autoCount: autoCount.value
        }
      }));
    } catch (e) { /* ignore quota errors */ }
  }

  const saved = loadSaved();

  // ---------- state ----------
  const state = {
    balance: saved ? saved.balance : 1000,
    displayBalance: saved ? saved.balance : 1000,
    risk: saved ? saved.risk : "medium",
    rows: saved ? saved.rows : 14,
    theme: saved ? saved.theme : "dark",
    turbo: saved ? !!saved.turbo : false,
    turboUsed: saved ? !!saved.turboUsed : false,
    verifyUsed: saved ? !!saved.verifyUsed : false,
    dropBias: saved ? saved.dropBias : 0,
    wagered: saved ? saved.wagered : 0,
    profit: saved ? saved.profit : 0,
    maxMult: saved ? saved.maxMult : 0,
    dropCount: saved ? saved.dropCount : 0,
    streak: saved && saved.streak ? saved.streak : { win: 0, lose: 0, maxWin: 0 },
    risksUsed: new Set(saved && saved.risksUsed ? saved.risksUsed : []),
    achievementsUnlocked: new Set(saved && saved.achievements ? saved.achievements : []),
    balanceHistory: saved && saved.balanceHistory && saved.balanceHistory.length ? saved.balanceHistory : [saved ? saved.balance : 1000],
    historyData: saved && saved.historyData ? saved.historyData : [],
    balls: [],
    particles: [],
    shake: 0,
    pegs: [],
    bins: [],
    multipliers: [],
    layout: null,
    autoplay: { active: false, remaining: 0, currentBet: 0, baseBet: 0, startBalance: 0, strat: null, pendingNonce: null, pendingSeedIndex: null },
    fairness: saved && saved.fairness ? saved.fairness : null
  };

  themeSelect.value = state.theme;
  document.body.dataset.theme = state.theme;
  riskSelect.value = state.risk;
  rowsRange.value = state.rows;
  rowsValue.textContent = state.rows;
  biasRange.value = Math.round(state.dropBias * 100);
  biasValue.textContent = biasLabel(state.dropBias * 100);
  turboCheck.checked = state.turbo;
  if (saved) {
    betInput.value = saved.bet;
    if (saved.strategyForm) {
      onLossSelect.value = saved.strategyForm.onLoss ?? "increase";
      onWinSelect.value = saved.strategyForm.onWin ?? "reset";
      stratPct.value = saved.strategyForm.pct ?? 100;
      stopProfitInput.value = saved.strategyForm.stopProfit ?? 0;
      stopLossInput.value = saved.strategyForm.stopLoss ?? 0;
      autoCount.value = saved.strategyForm.autoCount ?? 20;
    }
  }

  function biasLabel(v) {
    v = Math.round(v);
    if (v === 0) return "центр";
    return v < 0 ? `лево ${Math.abs(v)}%` : `право ${v}%`;
  }

  // ---------- audio ----------
  let audioCtx = null;
  let lastTick = 0;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
  }
  function playTick() {
    if (!audioCtx) return;
    const now = performance.now();
    if (now - lastTick < 25) return;
    lastTick = now;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 380 + Math.random() * 260;
    gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
    osc.stop(audioCtx.currentTime + 0.1);
  }
  function playLand(mult) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    const base = mult >= 5 ? 720 : mult >= 1 ? 500 : 300;
    osc.frequency.value = base;
    gain.gain.value = 0.09;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(base * 1.6, audioCtx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.stop(audioCtx.currentTime + 0.24);
  }

  // ---------- multiplier math ----------
  function pascalRow(n) {
    let row = [1];
    for (let i = 1; i <= n; i++) {
      const next = [1];
      for (let j = 1; j < i; j++) next.push(row[j - 1] + row[j]);
      next.push(1);
      row = next;
    }
    return row;
  }

  const RISK_CFG = {
    low: { k: 0.38, rtp: 0.97 },
    medium: { k: 0.55, rtp: 0.96 },
    high: { k: 0.8, rtp: 0.94 }
  };

  function niceRound(m) {
    if (m < 10) return Math.round(m * 100) / 100;
    if (m < 100) return Math.round(m * 10) / 10;
    return Math.round(m);
  }

  function computeMultipliers(rows, risk) {
    const n = rows;
    const C = pascalRow(n);
    const total = Math.pow(2, n);
    const p = C.map((c) => c / total);
    const cfg = RISK_CFG[risk];
    const raw = p.map((pi) => Math.pow(1 / pi, cfg.k));
    const expected = raw.reduce((sum, ri, i) => sum + p[i] * ri, 0);
    const scale = cfg.rtp / expected;
    return raw.map((ri) => Math.max(0.1, niceRound(ri * scale)));
  }

  // ---------- board layout ----------
  function buildLayout(rows) {
    const margin = 30;
    const centerX = CANVAS_W / 2;
    const spacingX = (CANVAS_W - margin * 2) / (rows + 1);
    const topY = 46;
    const binsHeight = 84;
    const bottomMargin = 18;
    const availableH = CANVAS_H - topY - binsHeight - bottomMargin;
    const spacingY = availableH / rows;
    const pegRadius = Math.max(3, Math.min(7, spacingX * 0.11));
    const ballRadius = pegRadius * 1.35;

    const wallLeft = centerX - (rows / 2) * spacingX;
    const wallRight = centerX + (rows / 2) * spacingX;
    const binsLeft = wallLeft - spacingX / 2;

    const pegs = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j <= i; j++) {
        const x = centerX + (j - i / 2) * spacingX;
        const y = topY + i * spacingY;
        pegs.push({ x, y, r: pegRadius, hitAt: 0 });
      }
    }

    const binsTopY = topY + (rows - 1) * spacingY + pegRadius * 2 + 6;
    const binsBottomY = binsTopY + binsHeight;

    const bins = [];
    for (let k = 0; k <= rows; k++) {
      bins.push({ left: binsLeft + k * spacingX, right: binsLeft + (k + 1) * spacingX, index: k, flash: 0 });
    }

    return { rows, centerX, spacingX, spacingY, topY, pegRadius, ballRadius, wallLeft, wallRight, binsLeft, pegs, bins, binsTopY, binsBottomY };
  }

  function rebuildBoard() {
    state.layout = buildLayout(state.rows);
    state.pegs = state.layout.pegs;
    state.bins = state.layout.bins;
    state.multipliers = computeMultipliers(state.rows, state.risk);
    state.balls = [];
  }

  function binColor(mult, minM, maxM) {
    const logM = Math.log(mult + 0.15);
    const logMin = Math.log(minM + 0.15);
    const logMax = Math.log(maxM + 0.15);
    let t = (logM - logMin) / (logMax - logMin || 1);
    t = Math.max(0, Math.min(1, t));
    const hue = 225 - t * 225;
    const light = 48 + t * 8;
    return `hsl(${hue}, 80%, ${light}%)`;
  }

  // ---------- physics ----------
  const GRAVITY = 0.34;
  const RESTITUTION = 0.52;
  const MAX_VX = 7.5;
  const MAX_VY = 13;

  function makeBallState(L, rng, bias, bet) {
    const biasOffset = bias * (L.rows / 2) * L.spacingX * 0.7;
    return {
      x: L.centerX + biasOffset + (rng() - 0.5) * L.spacingX * 0.6,
      y: 14,
      vx: (rng() - 0.5) * 1.2,
      vy: 1,
      radius: L.ballRadius,
      bet,
      settled: false,
      settleTimer: 0,
      paidOut: false,
      binIndex: null,
      rng,
      hue: rng() * 360,
      trail: []
    };
  }

  function stepBall(ball, L, visual) {
    if (ball.settled) {
      if (visual) ball.settleTimer += 1;
      return;
    }

    ball.vy += GRAVITY;
    ball.vx = Math.max(-MAX_VX, Math.min(MAX_VX, ball.vx));
    ball.vy = Math.max(-MAX_VY, Math.min(MAX_VY, ball.vy));
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (visual) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) ball.trail.shift();
    }

    for (const peg of L.pegs) {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const minDist = ball.radius + peg.r;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= (1 + RESTITUTION) * dot * nx;
        ball.vy -= (1 + RESTITUTION) * dot * ny;
        ball.vx += (ball.rng() - 0.5) * 0.7;
        if (visual) { peg.hitAt = performance.now(); playTick(); }
      }
    }

    if (ball.x - ball.radius < L.wallLeft) {
      ball.x = L.wallLeft + ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.6;
    } else if (ball.x + ball.radius > L.wallRight) {
      ball.x = L.wallRight - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.6;
    }

    if (ball.y + ball.radius > L.binsTopY) {
      const rawIndex = Math.floor((ball.x - L.binsLeft) / L.spacingX);
      const binIndex = Math.max(0, Math.min(L.rows, rawIndex));
      const bin = L.bins[binIndex];
      const bl = bin.left + ball.radius + 2;
      const br = bin.right - ball.radius - 2;
      if (ball.x < bl) { ball.x = bl; ball.vx *= -0.3; }
      if (ball.x > br) { ball.x = br; ball.vx *= -0.3; }
      ball.vx *= 0.92;

      if (ball.y + ball.radius >= L.binsBottomY) {
        ball.y = L.binsBottomY - ball.radius;
        ball.vy = 0; ball.vx = 0;
        ball.settled = true;
        ball.binIndex = binIndex;
      }
    }
  }

  function runToSettle(ball, L, maxIter) {
    let i = 0;
    while (!ball.settled && i < maxIter) { stepBall(ball, L, false); i++; }
    if (!ball.settled) {
      const rawIndex = Math.floor((ball.x - L.binsLeft) / L.spacingX);
      ball.binIndex = Math.max(0, Math.min(L.rows, rawIndex));
      ball.settled = true;
    }
  }

  function simulateToBin(rows, risk, serverSeed, clientSeed, nonce, bias) {
    const L = buildLayout(rows);
    const multipliers = computeMultipliers(rows, risk);
    const rng = mulberry32(fnv1a(`${serverSeed}:${clientSeed}:${nonce}`));
    const ball = makeBallState(L, rng, bias, 1);
    runToSettle(ball, L, 4000);
    return { binIndex: ball.binIndex, mult: multipliers[ball.binIndex] };
  }

  function updatePhysics() {
    const L = state.layout;
    if (!L) return;
    for (const ball of state.balls) {
      stepBall(ball, L, true);
      if (ball.settled && !ball.paidOut) {
        ball.paidOut = true;
        settleBall(ball, ball.binIndex);
      }
    }
    state.balls = state.balls.filter((b) => !(b.settled && b.settleTimer > 34));
  }

  function updateParticles() {
    for (const p of state.particles) {
      p.vy += 0.12;
      p.x += p.vx; p.y += p.vy;
      p.life -= 1;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function spawnConfetti(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
        life: 40 + Math.random() * 30, maxLife: 70,
        color: `hsl(${Math.random() * 360}, 85%, 60%)`,
        size: 2 + Math.random() * 3
      });
    }
    if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
  }

  // ---------- fairness ----------
  function currentSeedEntry() {
    return state.fairness.seedLog[state.fairness.seedLog.length - 1];
  }

  async function initFairness() {
    if (!state.fairness) {
      const serverSeed = randomHex(32);
      state.fairness = {
        clientSeed: randomHex(6),
        nonce: 0,
        seedLog: [{ serverSeed, hash: null, revealed: false, nonceStart: 0, nonceEnd: null }]
      };
    }
    clientSeedInput.value = state.fairness.clientSeed;
    for (const entry of state.fairness.seedLog) {
      if (!entry.hash) entry.hash = await sha256Hex(entry.serverSeed);
    }
    renderFairness();
    saveState();
  }

  function renderFairness() {
    const entry = currentSeedEntry();
    seedHashOut.textContent = entry.hash || "…";
    nonceOut.textContent = state.fairness.nonce;
    rotateSeedBtn.disabled = state.autoplay.active;

    revealedSeedsEl.innerHTML = "";
    const revealed = state.fairness.seedLog.filter((e) => e.revealed);
    if (!revealed.length) {
      revealedSeedsEl.innerHTML = `<div class="revealed-item">Пока нет раскрытых сидов — смените сид, чтобы раскрыть текущий.</div>`;
    } else {
      revealed.slice().reverse().forEach((e) => {
        const div = document.createElement("div");
        div.className = "revealed-item";
        div.textContent = `Сид: ${e.serverSeed} (хэш: ${e.hash.slice(0, 16)}…, броски 1–${e.nonceEnd})`;
        revealedSeedsEl.appendChild(div);
      });
    }
  }

  async function rotateSeed() {
    if (state.autoplay.active) { showToast("Остановите автоигру перед сменой сида"); return; }
    const cur = currentSeedEntry();
    cur.revealed = true;
    cur.nonceEnd = state.fairness.nonce;
    const newSeed = randomHex(32);
    const hash = await sha256Hex(newSeed);
    state.fairness.seedLog.push({ serverSeed: newSeed, hash, revealed: false, nonceStart: 0, nonceEnd: null });
    state.fairness.nonce = 0;
    renderFairness();
    saveState();
    showToast("Сид раскрыт и обновлён");
  }

  function requestVerifyFromHistory(record) {
    const entry = state.fairness.seedLog[record.seedIndex];
    if (!entry || !entry.revealed) {
      showToast("Сид ещё не раскрыт — смените сид, чтобы проверить");
      return;
    }
    vServerSeed.value = entry.serverSeed;
    vClientSeed.value = record.clientSeed;
    vNonce.value = record.nonce;
    vRisk.value = record.risk;
    vRows.value = record.rows;
    vBias.value = record.bias;
    verifyBtn.dataset.compareMult = record.mult;
    fairnessDetails.open = true;
    verifyBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    runVerify();
  }

  function runVerify() {
    const serverSeed = vServerSeed.value.trim();
    const clientSeed = vClientSeed.value.trim();
    const nonce = parseInt(vNonce.value);
    const risk = vRisk.value;
    const rows = Math.max(8, Math.min(16, parseInt(vRows.value) || 14));
    const bias = Math.max(-1, Math.min(1, parseFloat(vBias.value) || 0));
    if (!serverSeed || !clientSeed || !isFinite(nonce)) {
      verifyResult.textContent = "Заполните серверный сид, клиентский сид и nonce";
      return;
    }
    const { binIndex, mult } = simulateToBin(rows, risk, serverSeed, clientSeed, nonce, bias);
    state.verifyUsed = true;
    let html = `Результат: бин №${binIndex}, множитель <b>${mult}×</b>`;
    if (verifyBtn.dataset.compareMult) {
      const match = Math.abs(mult - parseFloat(verifyBtn.dataset.compareMult)) < 1e-9;
      html += `<br>${match ? "✅ Совпадает с историей" : "❌ Не совпадает с историей"}`;
      delete verifyBtn.dataset.compareMult;
    }
    verifyResult.innerHTML = html;
    checkAchievements();
    saveState();
  }

  // ---------- achievements ----------
  const ACHIEVEMENTS = [
    { id: "first_drop", title: "Первая кровь", desc: "Сделайте первый бросок", check: (s) => s.dropCount >= 1 },
    { id: "drops_50", title: "Разогрелся", desc: "50 бросков", check: (s) => s.dropCount >= 50 },
    { id: "drops_500", title: "Ветеран Plinko", desc: "500 бросков", check: (s) => s.dropCount >= 500 },
    { id: "big_win_20", title: "Крупная удача", desc: "Множитель ×20 и выше", check: (s) => s.maxMult >= 20 },
    { id: "big_win_100", title: "Джекпот", desc: "Множитель ×100 и выше", check: (s) => s.maxMult >= 100 },
    { id: "streak_5", title: "Пять подряд", desc: "5 побед подряд", check: (s) => s.streak.maxWin >= 5 },
    { id: "lose_streak_10", title: "Не везёт", desc: "10 проигрышей подряд", check: (s) => s.streak.lose >= 10 },
    { id: "all_risks", title: "Испытал всё", desc: "Сыграйте на всех уровнях риска", check: (s) => s.risksUsed.size >= 3 },
    { id: "turbo_used", title: "Скорость", desc: "Включите турбо-режим", check: (s) => s.turboUsed },
    { id: "verified", title: "Доверяй, но проверяй", desc: "Проверьте честность броска", check: (s) => s.verifyUsed },
    { id: "profit_1000", title: "В плюсе", desc: "Общая прибыль ≥ 1000", check: (s) => s.profit >= 1000 }
  ];

  function renderAchievements() {
    achGrid.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      const unlocked = state.achievementsUnlocked.has(a.id);
      const div = document.createElement("div");
      div.className = "ach-badge" + (unlocked ? " unlocked" : "");
      div.innerHTML = `<span class="ach-title">${unlocked ? "🏆 " : "🔒 "}${a.title}</span><span class="ach-desc">${a.desc}</span>`;
      achGrid.appendChild(div);
    }
    achCount.textContent = `${state.achievementsUnlocked.size}/${ACHIEVEMENTS.length}`;
  }

  function checkAchievements() {
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (!state.achievementsUnlocked.has(a.id) && a.check(state)) {
        state.achievementsUnlocked.add(a.id);
        showToast(`🏆 ${a.title}`);
        changed = true;
      }
    }
    if (changed) { renderAchievements(); saveState(); }
  }

  // ---------- payouts ----------
  function settleBall(ball, binIndex) {
    const mult = state.multipliers[binIndex];
    const payout = ball.bet * mult;
    const win = payout >= ball.bet;

    state.balance += payout;
    state.wagered += ball.bet;
    state.profit += payout - ball.bet;
    state.dropCount += 1;
    if (mult > state.maxMult) state.maxMult = mult;

    state.streak.win = win ? state.streak.win + 1 : 0;
    state.streak.lose = win ? 0 : state.streak.lose + 1;
    state.streak.maxWin = Math.max(state.streak.maxWin, state.streak.win);
    state.risksUsed.add(ball.risk);
    state.balanceHistory.push(state.balance);
    if (state.balanceHistory.length > 240) state.balanceHistory.shift();

    const bin = state.bins[binIndex];
    if (bin) bin.flash = 1;

    if (mult >= 20) {
      const cx = bin ? (bin.left + bin.right) / 2 : state.layout.centerX;
      spawnConfetti(cx, state.layout.binsTopY, mult >= 100 ? 70 : 40);
      state.shake = mult >= 100 ? 18 : mult >= 50 ? 12 : 8;
    }

    const record = {
      time: Date.now(), bet: ball.bet, mult, payout,
      nonce: ball.nonce, seedIndex: ball.seedIndex, clientSeed: ball.clientSeed,
      rows: ball.rows, risk: ball.risk, bias: ball.bias
    };
    state.historyData.unshift(record);
    if (state.historyData.length > 200) state.historyData.pop();
    addHistoryRow(record);

    flashBalance(win);
    showToast(`${mult}× → ${payout >= 100 ? payout.toFixed(0) : payout.toFixed(2)}`);
    playLand(mult);

    updateStatsUI();
    drawSparkline();
    checkAchievements();
    saveState();

    const A = state.autoplay;
    if (A.active && ball.nonce === A.pendingNonce && ball.seedIndex === A.pendingSeedIndex) {
      const strat = A.strat;
      if (win) {
        A.currentBet = strat.onWin === "reset" ? A.baseBet : strat.onWin === "increase" ? A.currentBet * (1 + strat.pct / 100) : A.currentBet;
      } else {
        A.currentBet = strat.onLoss === "reset" ? A.baseBet : strat.onLoss === "increase" ? A.currentBet * (1 + strat.pct / 100) : A.currentBet;
      }
      const profit = state.balance - A.startBalance;
      if (strat.stopProfit > 0 && profit >= strat.stopProfit) {
        stopAutoplay("Автоигра остановлена: цель по прибыли достигнута");
      } else if (strat.stopLoss > 0 && profit <= -strat.stopLoss) {
        stopAutoplay("Автоигра остановлена: лимит убытка достигнут");
      } else {
        setTimeout(autoplayStep, state.turbo ? 30 : 260);
      }
    }
  }

  // ---------- UI helpers ----------
  function formatMoney(n) {
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
    const parts = v.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return sign + parts.join(".");
  }

  let balanceFlashTimer = null;
  function flashBalance(up) {
    balanceEl.classList.remove("flash-up", "flash-down");
    void balanceEl.offsetWidth;
    balanceEl.classList.add(up ? "flash-up" : "flash-down");
    clearTimeout(balanceFlashTimer);
    balanceFlashTimer = setTimeout(() => balanceEl.classList.remove("flash-up", "flash-down"), 500);
  }

  let toastTimer = null;
  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 900);
  }

  function addHistoryRow(record) {
    const li = document.createElement("li");
    li.className = record.payout >= record.bet ? "win" : "lose";
    li.innerHTML = `
      <span class="mult">${record.mult}×</span>
      <span class="bet-amt">${formatMoney(record.bet)}</span>
      <span class="payout">${formatMoney(record.payout)}</span>
      <button class="verify-mini" title="Проверить честность">✓</button>
    `;
    li.querySelector(".verify-mini").addEventListener("click", () => requestVerifyFromHistory(record));
    historyList.insertBefore(li, historyList.firstChild);
    while (historyList.children.length > 40) historyList.removeChild(historyList.lastChild);
  }

  function updateStatsUI() {
    statWagered.textContent = formatMoney(state.wagered);
    statProfit.textContent = (state.profit >= 0 ? "+" : "") + formatMoney(state.profit);
    statProfit.style.color = state.profit >= 0 ? "var(--accent-2)" : "var(--danger)";
    statMax.textContent = state.maxMult.toFixed(2) + "×";
    statCount.textContent = state.dropCount;
    statStreak.textContent = state.streak.win;
    statMaxStreak.textContent = state.streak.maxWin;
  }

  function exportCSV() {
    const rows = [["Время", "Ставка", "Риск", "Ряды", "Множитель", "Выплата", "Nonce", "ХэшСида", "КлиентСид"]];
    for (const r of state.historyData) {
      const entry = state.fairness.seedLog[r.seedIndex];
      rows.push([
        new Date(r.time).toLocaleString("ru-RU"), r.bet, r.risk, r.rows, r.mult,
        r.payout.toFixed(2), r.nonce, entry ? entry.hash : "", r.clientSeed
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `plinko-history-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function drawSparkline() {
    const g = pnlCanvas.getContext("2d");
    const w = pnlCanvas.width, h = pnlCanvas.height;
    g.clearRect(0, 0, w, h);
    const data = state.balanceHistory;
    const start = data[0];
    pnlValueEl.textContent = (state.balance - start >= 0 ? "+" : "") + formatMoney(state.balance - start);
    pnlValueEl.style.color = state.balance - start >= 0 ? "var(--accent-2)" : "var(--danger)";
    if (data.length < 2) return;
    const min = Math.min(start, ...data);
    const max = Math.max(start, ...data);
    const range = (max - min) || 1;
    const stepX = w / (data.length - 1);
    const up = data[data.length - 1] >= start;

    const baseY = h - ((start - min) / range) * h;
    g.strokeStyle = "rgba(255,255,255,0.15)";
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(0, baseY); g.lineTo(w, baseY); g.stroke();
    g.setLineDash([]);

    g.beginPath();
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.strokeStyle = up ? "#3ddc97" : "#ff5470";
    g.lineWidth = 2;
    g.stroke();
    g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    g.fillStyle = up ? "rgba(61,220,151,0.12)" : "rgba(255,84,112,0.12)";
    g.fill();
  }

  // ---------- drawing ----------
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const L = state.layout;
    if (!L) return;

    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      state.shake -= 1;
    }

    const now = performance.now();
    for (const peg of L.pegs) {
      const dt = now - peg.hitAt;
      const glow = dt < 220 ? 1 - dt / 220 : 0;
      const scale = 1 + glow * 0.35;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r * scale, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0 ? `rgba(255, 255, 255, ${0.55 + glow * 0.45})` : "rgba(220, 226, 240, 0.85)";
      ctx.shadowColor = glow > 0 ? "rgba(124,92,255,0.9)" : "transparent";
      ctx.shadowBlur = glow > 0 ? 12 * glow : 0;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.wallLeft, L.topY - 20); ctx.lineTo(L.wallLeft, L.binsTopY);
    ctx.moveTo(L.wallRight, L.topY - 20); ctx.lineTo(L.wallRight, L.binsTopY);
    ctx.stroke();

    const minM = Math.min(...state.multipliers);
    const maxM = Math.max(...state.multipliers);
    for (const bin of L.bins) {
      const mult = state.multipliers[bin.index];
      const w = bin.right - bin.left;
      const h = L.binsBottomY - L.binsTopY;
      const flashBoost = bin.flash > 0 ? bin.flash : 0;
      ctx.fillStyle = binColor(mult, minM, maxM);
      ctx.globalAlpha = 0.85 + flashBoost * 0.15;
      ctx.fillRect(bin.left + 1.5, L.binsTopY, w - 3, h);
      ctx.globalAlpha = 1;

      if (flashBoost > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flashBoost * 0.5})`;
        ctx.fillRect(bin.left + 1.5, L.binsTopY, w - 3, h);
        bin.flash = Math.max(0, bin.flash - 0.045);
      }

      ctx.fillStyle = "rgba(10,12,18,0.85)";
      ctx.font = `${Math.max(9, Math.min(13, w * 0.24))}px Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = mult >= 100 ? Math.round(mult) + "×" : mult.toFixed(mult < 1 ? 1 : mult < 10 ? 2 : 1) + "×";
      ctx.fillText(label, bin.left + w / 2, L.binsTopY + h / 2);
    }

    for (const ball of state.balls) {
      const alpha = ball.settled ? Math.max(0, 1 - ball.settleTimer / 34) : 1;
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        ctx.globalAlpha = (i / ball.trail.length) * 0.25 * alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${ball.hue}, 90%, 65%)`;
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0.5,
        ball.x, ball.y, ball.radius * 1.4
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, `hsl(${ball.hue}, 90%, 68%)`);
      grad.addColorStop(1, `hsl(${ball.hue}, 80%, 45%)`);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function tweenBalance() {
    state.displayBalance += (state.balance - state.displayBalance) * 0.18;
    if (Math.abs(state.balance - state.displayBalance) < 0.005) state.displayBalance = state.balance;
    balanceEl.textContent = formatMoney(state.displayBalance);
  }

  function loop() {
    updatePhysics();
    updateParticles();
    tweenBalance();
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- actions ----------
  function currentBet() {
    let v = parseFloat(betInput.value);
    if (!isFinite(v) || v <= 0) v = 1;
    return Math.round(v * 100) / 100;
  }

  function dropOne(betAmount) {
    ensureAudio();
    betAmount = Math.max(0.1, Math.round(betAmount * 100) / 100);
    if (betAmount > state.balance) { showToast("Недостаточно средств"); return false; }
    state.balance -= betAmount;

    const seedEntry = currentSeedEntry();
    state.fairness.nonce += 1;
    const meta = {
      seedIndex: state.fairness.seedLog.length - 1,
      nonce: state.fairness.nonce,
      clientSeed: state.fairness.clientSeed,
      rows: state.rows,
      risk: state.risk,
      bias: state.dropBias
    };
    const rng = mulberry32(fnv1a(`${seedEntry.serverSeed}:${meta.clientSeed}:${meta.nonce}`));
    const ball = makeBallState(state.layout, rng, meta.bias, betAmount);
    Object.assign(ball, meta);

    if (state.turbo) {
      runToSettle(ball, state.layout, 4000);
      settleBall(ball, ball.binIndex);
    } else {
      state.balls.push(ball);
    }
    nonceOut.textContent = state.fairness.nonce;
    return meta.nonce;
  }

  dropBtn.addEventListener("click", () => dropOne(currentBet()));

  dropTenBtn.addEventListener("click", () => {
    let i = 0;
    const gap = state.turbo ? 35 : 110;
    const iv = setInterval(() => {
      if (dropOne(currentBet()) === false || ++i >= 10) clearInterval(iv);
    }, gap);
  });

  function readStrategy() {
    return {
      onLoss: onLossSelect.value,
      onWin: onWinSelect.value,
      pct: Math.max(1, parseFloat(stratPct.value) || 100),
      stopProfit: Math.max(0, parseFloat(stopProfitInput.value) || 0),
      stopLoss: Math.max(0, parseFloat(stopLossInput.value) || 0)
    };
  }

  function autoplayStep() {
    const A = state.autoplay;
    if (!A.active) return;
    if (A.remaining <= 0) { stopAutoplay("Автоигра завершена"); return; }
    betInput.value = A.currentBet.toFixed(2);
    // Must be set before dropOne(): in turbo mode settleBall() runs
    // synchronously inside dropOne(), so pendingNonce has to already
    // match by the time it checks.
    A.pendingNonce = state.fairness.nonce + 1;
    A.pendingSeedIndex = state.fairness.seedLog.length - 1;
    const nonce = dropOne(A.currentBet);
    if (nonce === false) { stopAutoplay("Автоигра остановлена: недостаточно средств"); return; }
    A.remaining -= 1;
  }

  function startAutoplay() {
    const n = Math.max(1, parseInt(autoCount.value) || 1);
    state.autoplay = {
      active: true,
      remaining: n,
      currentBet: currentBet(),
      baseBet: currentBet(),
      startBalance: state.balance,
      strat: readStrategy(),
      pendingNonce: null,
      pendingSeedIndex: null
    };
    autoBtn.textContent = "Стоп";
    autoBtn.classList.add("active");
    renderFairness();
    autoplayStep();
  }

  function stopAutoplay(message) {
    state.autoplay.active = false;
    autoBtn.textContent = "Автоигра";
    autoBtn.classList.remove("active");
    renderFairness();
    if (message) showToast(message);
  }

  autoBtn.addEventListener("click", () => {
    if (state.autoplay.active) stopAutoplay("Автоигра остановлена");
    else startAutoplay();
  });

  betHalfBtn.addEventListener("click", () => { betInput.value = Math.max(0.1, currentBet() / 2).toFixed(2); saveState(); });
  betDoubleBtn.addEventListener("click", () => { betInput.value = (currentBet() * 2).toFixed(2); saveState(); });
  betInput.addEventListener("change", saveState);

  riskSelect.addEventListener("change", () => { state.risk = riskSelect.value; rebuildBoard(); saveState(); });
  rowsRange.addEventListener("input", () => {
    state.rows = parseInt(rowsRange.value);
    rowsValue.textContent = state.rows;
    rebuildBoard();
    saveState();
  });

  biasRange.addEventListener("input", () => {
    const v = parseInt(biasRange.value);
    state.dropBias = v / 100;
    biasValue.textContent = biasLabel(v);
    saveState();
  });

  turboCheck.addEventListener("change", () => {
    state.turbo = turboCheck.checked;
    if (state.turbo) state.turboUsed = true;
    checkAchievements();
    saveState();
  });

  [onLossSelect, onWinSelect, stratPct, stopProfitInput, stopLossInput, autoCount].forEach((el) => {
    el.addEventListener("change", saveState);
  });

  themeSelect.addEventListener("change", () => {
    state.theme = themeSelect.value;
    document.body.dataset.theme = state.theme;
    saveState();
  });

  resetBtn.addEventListener("click", () => {
    state.balance = 1000;
    state.displayBalance = 1000;
    state.wagered = 0;
    state.profit = 0;
    state.maxMult = 0;
    state.dropCount = 0;
    state.streak = { win: 0, lose: 0, maxWin: 0 };
    state.balanceHistory = [1000];
    state.historyData = [];
    historyList.innerHTML = "";
    updateStatsUI();
    drawSparkline();
    saveState();
    showToast("Баланс сброшен");
  });

  exportCsvBtn.addEventListener("click", () => {
    if (!state.historyData.length) { showToast("История пуста"); return; }
    exportCSV();
  });

  clientSeedInput.addEventListener("change", () => {
    const v = clientSeedInput.value.trim() || randomHex(6);
    state.fairness.clientSeed = v;
    clientSeedInput.value = v;
    saveState();
  });
  rotateSeedBtn.addEventListener("click", rotateSeed);
  verifyBtn.addEventListener("click", runVerify);

  // ---------- init ----------
  rebuildBoard();
  updateStatsUI();
  renderAchievements();
  drawSparkline();
  initFairness();
  requestAnimationFrame(loop);
})();
