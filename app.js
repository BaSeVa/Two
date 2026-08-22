(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const toastEl = document.getElementById("toast");

  const balanceEl = document.getElementById("balance");
  const betInput = document.getElementById("betInput");
  const betHalfBtn = document.getElementById("betHalf");
  const betDoubleBtn = document.getElementById("betDouble");
  const riskSelect = document.getElementById("riskSelect");
  const rowsRange = document.getElementById("rowsRange");
  const rowsValue = document.getElementById("rowsValue");
  const dropBtn = document.getElementById("dropBtn");
  const dropTenBtn = document.getElementById("dropTenBtn");
  const autoBtn = document.getElementById("autoBtn");
  const autoCount = document.getElementById("autoCount");
  const resetBtn = document.getElementById("resetBtn");
  const historyList = document.getElementById("historyList");

  const statWagered = document.getElementById("statWagered");
  const statProfit = document.getElementById("statProfit");
  const statMax = document.getElementById("statMax");
  const statCount = document.getElementById("statCount");

  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;

  // ---------- persistence ----------
  const STORAGE_KEY = "plinko-sim-state-v1";

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
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
        wagered: state.wagered,
        profit: state.profit,
        maxMult: state.maxMult,
        dropCount: state.dropCount
      }));
    } catch (e) { /* ignore */ }
  }

  const saved = loadSaved();

  // ---------- state ----------
  const state = {
    balance: saved ? saved.balance : 1000,
    risk: saved ? saved.risk : "medium",
    rows: saved ? saved.rows : 14,
    wagered: saved ? saved.wagered : 0,
    profit: saved ? saved.profit : 0,
    maxMult: saved ? saved.maxMult : 0,
    dropCount: saved ? saved.dropCount : 0,
    balls: [],
    pegs: [],
    bins: [],
    multipliers: [],
    layout: null,
    autoplay: { active: false, remaining: 0, timer: null }
  };

  if (saved) {
    riskSelect.value = state.risk;
    rowsRange.value = state.rows;
    betInput.value = saved.bet;
  }
  rowsValue.textContent = state.rows;

  // ---------- audio ----------
  let audioCtx = null;
  let lastTick = 0;
  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { audioCtx = null; }
    }
  }
  function playTick(intensity) {
    if (!audioCtx) return;
    const now = performance.now();
    if (now - lastTick < 25) return;
    lastTick = now;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 380 + Math.random() * 260;
    gain.gain.value = 0.05 * Math.min(1, intensity);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
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
    osc.connect(gain);
    gain.connect(audioCtx.destination);
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
    if (m < 1) return Math.round(m * 100) / 100;
    if (m < 10) return Math.round(m * 100) / 100;
    if (m < 100) return Math.round(m * 10) / 10;
    return Math.round(m);
  }

  function computeMultipliers(rows, risk) {
    const n = rows;
    const bins = rows + 1;
    const C = pascalRow(n);
    const total = Math.pow(2, n);
    const p = C.map((c) => c / total);
    const cfg = RISK_CFG[risk];
    const raw = p.map((pi) => Math.pow(1 / pi, cfg.k));
    const expected = raw.reduce((sum, ri, i) => sum + p[i] * ri, 0);
    const scale = cfg.rtp / expected;
    const mult = raw.map((ri) => Math.max(0.1, niceRound(ri * scale)));
    return mult;
  }

  // ---------- board layout ----------
  function buildLayout(rows) {
    const margin = 30;
    const centerX = CANVAS_W / 2;
    // rows+1 bins must fit within the margins; pegs (rows wide) sit half a
    // bin-width inset from the bins on each side so bin centers line up
    // with the gaps between pegs in the last row.
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
      bins.push({
        left: binsLeft + k * spacingX,
        right: binsLeft + (k + 1) * spacingX,
        index: k,
        flash: 0
      });
    }

    return {
      rows, centerX, spacingX, spacingY, topY, pegRadius, ballRadius,
      wallLeft, wallRight, binsLeft, pegs, bins, binsTopY, binsBottomY
    };
  }

  function rebuildBoard() {
    state.layout = buildLayout(state.rows);
    state.pegs = state.layout.pegs;
    state.bins = state.layout.bins;
    state.multipliers = computeMultipliers(state.rows, state.risk);
    state.balls = [];
  }

  // ---------- colors ----------
  function binColor(mult, minM, maxM) {
    const logM = Math.log(mult + 0.15);
    const logMin = Math.log(minM + 0.15);
    const logMax = Math.log(maxM + 0.15);
    let t = (logM - logMin) / (logMax - logMin || 1);
    t = Math.max(0, Math.min(1, t));
    const hue = 225 - t * 225; // blue -> red
    const light = 48 + t * 8;
    return `hsl(${hue}, 80%, ${light}%)`;
  }

  // ---------- physics ----------
  const GRAVITY = 0.34;
  const RESTITUTION = 0.52;
  const MAX_VX = 7.5;
  const MAX_VY = 13;

  function spawnBall(bet) {
    const L = state.layout;
    const ball = {
      x: L.centerX + (Math.random() - 0.5) * L.spacingX * 0.6,
      y: 14,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1,
      radius: L.ballRadius,
      bet,
      settled: false,
      settleTimer: 0,
      binIndex: null,
      hue: Math.random() * 360
    };
    state.balls.push(ball);
  }

  function updatePhysics() {
    const L = state.layout;
    if (!L) return;

    for (const ball of state.balls) {
      if (ball.settled) {
        ball.settleTimer += 1;
        continue;
      }

      ball.vy += GRAVITY;
      ball.vx = Math.max(-MAX_VX, Math.min(MAX_VX, ball.vx));
      ball.vy = Math.max(-MAX_VY, Math.min(MAX_VY, ball.vy));
      ball.x += ball.vx;
      ball.y += ball.vy;

      // peg collisions
      for (const peg of L.pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const minDist = ball.radius + peg.r;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= (1 + RESTITUTION) * dot * nx;
          ball.vy -= (1 + RESTITUTION) * dot * ny;
          ball.vx += (Math.random() - 0.5) * 0.7;

          peg.hitAt = performance.now();
          playTick(0.6);
        }
      }

      // side walls of the triangle
      if (ball.x - ball.radius < L.wallLeft) {
        ball.x = L.wallLeft + ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.6;
      } else if (ball.x + ball.radius > L.wallRight) {
        ball.x = L.wallRight - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.6;
      }

      // bin funnel zone
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
          ball.vy = 0;
          ball.vx = 0;
          ball.settled = true;
          ball.binIndex = binIndex;
          settleBall(ball, binIndex);
        }
      }
    }

    state.balls = state.balls.filter((b) => !(b.settled && b.settleTimer > 34));
  }

  // ---------- payouts ----------
  function settleBall(ball, binIndex) {
    const mult = state.multipliers[binIndex];
    const payout = ball.bet * mult;
    state.balance += payout;
    state.wagered += ball.bet;
    state.profit += payout - ball.bet;
    state.dropCount += 1;
    if (mult > state.maxMult) state.maxMult = mult;

    const bin = state.bins[binIndex];
    bin.flash = 1;

    addHistory(ball.bet, mult, payout);
    flashBalance(payout - ball.bet >= 0);
    showToast(`${mult}× → ${payout >= 100 ? payout.toFixed(0) : payout.toFixed(2)}`);
    playLand(mult);

    updateStatsUI();
    saveState();
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
    balanceFlashTimer = setTimeout(() => {
      balanceEl.classList.remove("flash-up", "flash-down");
    }, 500);
  }

  let toastTimer = null;
  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 900);
  }

  function addHistory(bet, mult, payout) {
    const li = document.createElement("li");
    li.className = payout >= bet ? "win" : "lose";
    li.innerHTML = `
      <span class="mult">${mult}×</span>
      <span class="bet-amt">ставка ${formatMoney(bet)}</span>
      <span class="payout">${formatMoney(payout)}</span>
    `;
    historyList.insertBefore(li, historyList.firstChild);
    while (historyList.children.length > 40) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  function updateStatsUI() {
    balanceEl.textContent = formatMoney(state.balance);
    statWagered.textContent = formatMoney(state.wagered);
    statProfit.textContent = (state.profit >= 0 ? "+" : "") + formatMoney(state.profit);
    statProfit.style.color = state.profit >= 0 ? "var(--accent-2)" : "var(--danger)";
    statMax.textContent = state.maxMult.toFixed(2) + "×";
    statCount.textContent = state.dropCount;
  }

  // ---------- drawing ----------
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const L = state.layout;
    if (!L) return;

    // pegs
    const now = performance.now();
    for (const peg of L.pegs) {
      const dt = now - peg.hitAt;
      const glow = dt < 220 ? 1 - dt / 220 : 0;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0
        ? `rgba(255, 255, 255, ${0.55 + glow * 0.45})`
        : "rgba(220, 226, 240, 0.85)";
      ctx.shadowColor = glow > 0 ? "rgba(124,92,255,0.9)" : "transparent";
      ctx.shadowBlur = glow > 0 ? 12 * glow : 0;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // walls
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.wallLeft, L.topY - 20);
    ctx.lineTo(L.wallLeft, L.binsTopY);
    ctx.moveTo(L.wallRight, L.topY - 20);
    ctx.lineTo(L.wallRight, L.binsTopY);
    ctx.stroke();

    // bins
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

    // balls
    for (const ball of state.balls) {
      const alpha = ball.settled ? Math.max(0, 1 - ball.settleTimer / 34) : 1;
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
  }

  function loop() {
    updatePhysics();
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- actions ----------
  function currentBet() {
    let v = parseFloat(betInput.value);
    if (!isFinite(v) || v <= 0) v = 1;
    return Math.round(v * 100) / 100;
  }

  function dropOne() {
    ensureAudio();
    const bet = currentBet();
    if (bet > state.balance) {
      showToast("Недостаточно средств");
      return false;
    }
    state.balance -= bet;
    updateStatsUI();
    spawnBall(bet);
    return true;
  }

  dropBtn.addEventListener("click", () => dropOne());

  dropTenBtn.addEventListener("click", () => {
    let i = 0;
    const iv = setInterval(() => {
      if (!dropOne() || ++i >= 10) clearInterval(iv);
    }, 110);
  });

  function stopAutoplay() {
    state.autoplay.active = false;
    clearInterval(state.autoplay.timer);
    autoBtn.textContent = "Автоигра";
    autoBtn.classList.remove("active");
  }

  autoBtn.addEventListener("click", () => {
    if (state.autoplay.active) {
      stopAutoplay();
      return;
    }
    const n = Math.max(1, parseInt(autoCount.value) || 1);
    state.autoplay.active = true;
    state.autoplay.remaining = n;
    autoBtn.textContent = "Стоп";
    autoBtn.classList.add("active");
    state.autoplay.timer = setInterval(() => {
      if (state.autoplay.remaining <= 0) { stopAutoplay(); return; }
      if (!dropOne()) { stopAutoplay(); return; }
      state.autoplay.remaining -= 1;
    }, 200);
  });

  betHalfBtn.addEventListener("click", () => {
    betInput.value = Math.max(0.1, currentBet() / 2).toFixed(2);
  });
  betDoubleBtn.addEventListener("click", () => {
    betInput.value = (currentBet() * 2).toFixed(2);
  });

  riskSelect.addEventListener("change", () => {
    state.risk = riskSelect.value;
    rebuildBoard();
    saveState();
  });

  rowsRange.addEventListener("input", () => {
    state.rows = parseInt(rowsRange.value);
    rowsValue.textContent = state.rows;
    rebuildBoard();
    saveState();
  });

  resetBtn.addEventListener("click", () => {
    state.balance = 1000;
    state.wagered = 0;
    state.profit = 0;
    state.maxMult = 0;
    state.dropCount = 0;
    historyList.innerHTML = "";
    updateStatsUI();
    saveState();
    showToast("Баланс сброшен");
  });

  // ---------- init ----------
  rebuildBoard();
  updateStatsUI();
  requestAnimationFrame(loop);
})();
