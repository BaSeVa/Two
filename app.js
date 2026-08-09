"use strict";

const TEAMS = [
  { name: "Titan Racing", color: "#e10600", drivers: ["M. Rossato", "K. Lindqvist"] },
  { name: "Meridian GP", color: "#1e6fe0", drivers: ["A. Dubois", "R. Alvarez"] },
  { name: "Vertex Motorsport", color: "#ff8c1a", drivers: ["T. Naka", "J. Verhoeven"] },
  { name: "Nova Racing", color: "#00d2be", drivers: ["S. Okafor", "L. Bergstrom"] },
  { name: "Falcon Grand Prix", color: "#1a2a6c", drivers: ["P. Costa", "H. Mikkelsen"] },
  { name: "Solstice Racing", color: "#ff2d95", drivers: ["E. Laurent", "D. Marchetti"] },
  { name: "Ironclad GP", color: "#1f7a3f", drivers: ["G. Petrov", "W. Sinclair"] },
  { name: "Comet Racing", color: "#f5c518", drivers: ["N. Yamashita", "B. O'Connell"] },
  { name: "Obsidian Motorsport", color: "#9aa0ab", drivers: ["C. Reyes", "F. Haugen"] },
  { name: "Zenith Racing", color: "#8c2de0", drivers: ["I. Kowalski", "V. Santos"] },
];

const TRACK_PATH_D =
  "M270,90 L630,90 A135,135 0 0 1 630,360 L270,360 A135,135 0 0 1 270,90 Z";

const TICKS_PER_LAP = 220;
const PIT_DURATION_TICKS = 55;
const MAX_TICKS_SAFETY = 200000;

let state = null;
let svgEls = { path: null, carGroup: null };
let running = false;
let raf = null;

const el = (id) => document.getElementById(id);
const lapsInput = el("laps-input");
const speedSelect = el("speed-select");
const startBtn = el("start-btn");
const pauseBtn = el("pause-btn");
const resetBtn = el("reset-btn");
const weatherIndicator = el("weather-indicator");
const lapCounterEl = el("lap-counter");
const leaderboardBody = el("leaderboard-body");
const raceLogEl = el("race-log");
const resultsModal = el("results-modal");
const podiumEl = el("podium");
const resultsBody = el("results-body");
const closeModalBtn = el("close-modal-btn");

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function gaussian() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function makeCars() {
  const cars = [];
  let number = 1;
  TEAMS.forEach((team) => {
    team.drivers.forEach((driverName) => {
      cars.push({
        id: `car-${number}`,
        number,
        name: driverName,
        team: team.name,
        color: team.color,
        skill: rand(0.9, 1.06),
        consistency: rand(0.55, 1.0),
        wetSkill: rand(0.75, 1.15),
        reliability: 1 - rand(0.000002, 0.000006),
        stintLaps: rand(6, 13),
        progress: 0,
        lap: 0,
        tireWear: 0,
        pitStops: 0,
        pitTicksLeft: 0,
        pitThreshold: rand(0.62, 0.9),
        finished: false,
        dnf: false,
        finishTick: null,
        finishPos: null,
        gridPos: null,
      });
      number += 1;
    });
  });
  cars.sort((a, b) => b.skill - a.skill + rand(-0.15, 0.15));
  cars.forEach((c, i) => (c.gridPos = i + 1));
  return cars;
}

function createState() {
  return {
    cars: makeCars(),
    totalLaps: clampLaps(parseInt(lapsInput.value, 10) || 20),
    tick: 0,
    weather: "dry",
    weatherTicksLeft: Math.floor(rand(400, 900)),
    finishedCount: 0,
    raceOver: false,
    lastOrder: [],
  };
}

function clampLaps(v) {
  return Math.min(70, Math.max(3, v));
}

function buildTrack() {
  const svg = el("track-svg");
  svg.innerHTML = "";

  const asphalt = document.createElementNS("http://www.w3.org/2000/svg", "path");
  asphalt.setAttribute("d", TRACK_PATH_D);
  asphalt.setAttribute("fill", "none");
  asphalt.setAttribute("stroke", "#33363f");
  asphalt.setAttribute("stroke-width", "34");
  asphalt.setAttribute("stroke-linejoin", "round");
  svg.appendChild(asphalt);

  const kerb = document.createElementNS("http://www.w3.org/2000/svg", "path");
  kerb.setAttribute("d", TRACK_PATH_D);
  kerb.setAttribute("fill", "none");
  kerb.setAttribute("stroke", "#4a4e5a");
  kerb.setAttribute("stroke-width", "34");
  kerb.setAttribute("stroke-dasharray", "2 22");
  kerb.setAttribute("opacity", "0.5");
  svg.appendChild(kerb);

  const centerline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  centerline.setAttribute("d", TRACK_PATH_D);
  centerline.setAttribute("fill", "none");
  centerline.setAttribute("stroke", "#ffffff");
  centerline.setAttribute("stroke-width", "2");
  centerline.setAttribute("stroke-dasharray", "8 10");
  centerline.setAttribute("opacity", "0.35");
  svg.appendChild(centerline);

  const startFlag = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  startFlag.setAttribute("x", "263");
  startFlag.setAttribute("y", "73");
  startFlag.setAttribute("width", "14");
  startFlag.setAttribute("height", "34");
  startFlag.setAttribute("fill", "url(#checker)");
  svg.appendChild(startFlag);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <pattern id="checker" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#fff"/>
      <rect width="3.5" height="3.5" fill="#111"/>
      <rect x="3.5" y="3.5" width="3.5" height="3.5" fill="#111"/>
    </pattern>`;
  svg.insertBefore(defs, svg.firstChild);

  const carGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(carGroup);

  svgEls.path = asphalt;
  svgEls.carGroup = carGroup;
  svgEls.totalLength = asphalt.getTotalLength();

  state.cars.forEach((car) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", car.id);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "7");
    circle.setAttribute("fill", car.color);
    circle.setAttribute("stroke", "#0c0e14");
    circle.setAttribute("stroke-width", "1.5");
    g.appendChild(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dy", "-10");
    label.setAttribute("font-size", "8");
    label.setAttribute("fill", "#e8eaf0");
    label.textContent = car.number;
    g.appendChild(label);

    carGroup.appendChild(g);
    car.svgGroup = g;
  });
}

function pointAt(fraction) {
  const len = ((fraction % 1) + 1) % 1 * svgEls.totalLength;
  return svgEls.path.getPointAtLength(len);
}

function updateCarPosition(car, laneOffsetIndex) {
  if (!car.svgGroup) return;
  const frac = car.progress;
  const p1 = pointAt(frac);
  const p2 = pointAt(frac + 0.004);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const lane = ((laneOffsetIndex % 5) - 2) * 5.5;
  const x = p1.x + nx * lane;
  const y = p1.y + ny * lane;
  car.svgGroup.setAttribute("transform", `translate(${x},${y})`);
}

function logEvent(message, type = "info") {
  const entry = document.createElement("div");
  entry.className = `log-entry event-${type}`;
  entry.textContent = message;
  raceLogEl.appendChild(entry);
  while (raceLogEl.children.length > 120) {
    raceLogEl.removeChild(raceLogEl.firstChild);
  }
}

function weatherSpeedFactor(car) {
  if (state.weather === "dry") return 1;
  return 0.8 * car.wetSkill;
}

function simulateTick() {
  if (state.raceOver) return;
  state.tick += 1;

  state.weatherTicksLeft -= 1;
  if (state.weatherTicksLeft <= 0) {
    const wasRain = state.weather === "rain";
    state.weather = wasRain ? "dry" : Math.random() < 0.35 ? "rain" : "dry";
    state.weatherTicksLeft = Math.floor(rand(350, 750));
    if (state.weather === "rain" && !wasRain) {
      logEvent("🌧️ Начинается дождь! Сцепление с трассой ухудшается.", "weather");
    } else if (state.weather === "dry" && wasRain) {
      logEvent("☀️ Дождь прекратился, трасса подсыхает.", "weather");
    }
  }

  const activeCars = state.cars.filter((c) => !c.finished && !c.dnf);

  activeCars.forEach((car) => {
    if (car.pitTicksLeft > 0) {
      car.pitTicksLeft -= 1;
      if (car.pitTicksLeft === 0) {
        logEvent(`🔧 ${car.name} (${car.team}) выезжает из боксов на новых шинах.`, "pit");
      }
      return;
    }

    if (Math.random() > car.reliability) {
      car.dnf = true;
      logEvent(`💥 Сход! ${car.name} (${car.team}) остановился из-за поломки.`, "dnf");
      return;
    }

    const base = 1 / TICKS_PER_LAP;
    const skillFactor = car.skill;
    const wearPenalty = 1 - car.tireWear * 0.35;
    const weatherFactor = weatherSpeedFactor(car);
    const noise = 1 + gaussian() * (0.12 * (1.15 - car.consistency));
    const speed = base * skillFactor * wearPenalty * weatherFactor * Math.max(noise, 0.4);

    car.progress += speed;
    const wearRate = (base / car.stintLaps) * (state.weather === "rain" ? 1.4 : 1);
    car.tireWear = Math.min(1, car.tireWear + wearRate);

    const newLap = Math.floor(car.progress);
    if (newLap > car.lap) {
      car.lap = newLap;
    }

    if (
      car.tireWear >= car.pitThreshold &&
      car.lap < state.totalLaps - 1 &&
      car.pitTicksLeft === 0
    ) {
      car.pitTicksLeft = PIT_DURATION_TICKS;
      car.tireWear = 0;
      car.pitStops += 1;
      logEvent(`🔧 ${car.name} (${car.team}) заезжает в боксы на пит-стоп #${car.pitStops}.`, "pit");
    }

    if (car.lap >= state.totalLaps && !car.finished) {
      car.finished = true;
      car.finishTick = state.tick;
      state.finishedCount += 1;
      car.finishPos = state.finishedCount;
      const posLabel = car.finishPos === 1 ? "🥇 Победа!" : car.finishPos === 2 ? "🥈" : car.finishPos === 3 ? "🥉" : `P${car.finishPos}`;
      logEvent(`🏁 Финиш: ${car.name} (${car.team}) — ${posLabel}`, "finish");
    }
  });

  detectOvertakes();

  const remaining = state.cars.filter((c) => !c.finished && !c.dnf);
  if (remaining.length === 0 || state.tick > MAX_TICKS_SAFETY) {
    state.raceOver = true;
  }
}

function currentOrder() {
  return [...state.cars]
    .sort((a, b) => {
      if (a.finished && b.finished) return a.finishPos - b.finishPos;
      if (a.finished) return -1;
      if (b.finished) return 1;
      if (a.dnf && b.dnf) return b.progress - a.progress;
      if (a.dnf) return 1;
      if (b.dnf) return -1;
      return b.progress - a.progress;
    })
    .map((c) => c.id);
}

function detectOvertakes() {
  const order = currentOrder();
  if (state.lastOrder.length) {
    for (let i = 0; i < 3 && i < order.length; i++) {
      const carId = order[i];
      const prevIdx = state.lastOrder.indexOf(carId);
      if (prevIdx > i) {
        const car = state.cars.find((c) => c.id === carId);
        if (car && !car.finished && !car.dnf) {
          logEvent(`⚡ ${car.name} поднимается на P${i + 1}!`, "overtake");
        }
      }
    }
  }
  state.lastOrder = order;
}

function render() {
  const order = currentOrder();

  order.forEach((id, idx) => {
    const car = state.cars.find((c) => c.id === id);
    if (!car.finished) updateCarPosition(car, idx);
    else if (car.svgGroup) car.svgGroup.style.opacity = "0.35";
  });

  leaderboardBody.innerHTML = "";
  order.forEach((id, idx) => {
    const car = state.cars.find((c) => c.id === id);
    const tr = document.createElement("tr");
    if (car.dnf) tr.className = "row-dnf";
    if (idx === 0 && !car.finished) tr.className = (tr.className + " row-leader").trim();

    let status;
    if (car.finished) status = car.finishPos === 1 ? "Победитель" : `Финиш P${car.finishPos}`;
    else if (car.dnf) status = "Сход";
    else if (car.pitTicksLeft > 0) status = `Бокс (${Math.ceil(car.pitTicksLeft / 10)}с)`;
    else status = `Круг ${Math.min(car.lap + 1, state.totalLaps)}/${state.totalLaps}`;

    const wearPct = Math.round(car.tireWear * 100);
    const wearColor = wearPct > 75 ? "var(--bad)" : wearPct > 45 ? "var(--warn)" : "var(--good)";

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><span class="team-dot" style="background:${car.color}"></span>${car.name}</td>
      <td>${car.team}</td>
      <td>${status}</td>
      <td><span class="tire-bar"><span class="tire-bar-fill" style="width:${wearPct}%;background:${wearColor}"></span></span></td>
    `;
    leaderboardBody.appendChild(tr);
  });

  const leader = state.cars.find((c) => c.id === order[0]);
  lapCounterEl.textContent = `Круг ${Math.min((leader?.lap ?? 0) + 1, state.totalLaps)} / ${state.totalLaps}`;
  weatherIndicator.textContent = state.weather === "rain" ? "🌧️ Дождь" : "☀️ Сухо";
}

function loop() {
  if (!running) return;
  const speed = parseInt(speedSelect.value, 10);
  for (let i = 0; i < speed; i++) {
    simulateTick();
    if (state.raceOver) break;
  }
  render();
  if (state.raceOver) {
    finishRace();
    return;
  }
  raf = requestAnimationFrame(loop);
}

function finishRace() {
  running = false;
  startBtn.disabled = true;
  pauseBtn.disabled = true;
  startBtn.textContent = "Старт";

  const finalOrder = currentOrder().map((id) => state.cars.find((c) => c.id === id));
  podiumEl.innerHTML = "";
  resultsBody.innerHTML = "";

  finalOrder.slice(0, 3).forEach((car, idx) => {
    const step = document.createElement("div");
    step.className = `podium-step p${idx + 1}`;
    step.innerHTML = `<div class="place-num">${idx + 1}</div><div>${car.name}</div><div style="color:var(--text-dim);font-size:0.8rem">${car.team}</div>`;
    podiumEl.appendChild(step);
  });

  finalOrder.forEach((car, idx) => {
    const tr = document.createElement("tr");
    const result = car.dnf ? "DNF" : car.finished ? `+${car.pitStops} пит-стопов` : "—";
    tr.innerHTML = `<td>${car.dnf ? "DNF" : idx + 1}</td><td>${car.name}</td><td>${car.team}</td><td>${result}</td>`;
    resultsBody.appendChild(tr);
  });

  resultsModal.classList.remove("hidden");
  logEvent("🏁 Гонка завершена!", "finish");
}

function resetAll() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raceLogEl.innerHTML = "";
  resultsModal.classList.add("hidden");
  state = createState();
  buildTrack();
  render();
  startBtn.disabled = false;
  startBtn.textContent = "Старт";
  pauseBtn.disabled = true;
  pauseBtn.textContent = "Пауза";
  lapsInput.disabled = false;
  logEvent(`🏎️ Стартовая решётка готова. ${state.totalLaps} кругов, 20 пилотов.`, "info");
}

startBtn.addEventListener("click", () => {
  if (state.raceOver) return;
  running = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  lapsInput.disabled = true;
  if (state.tick === 0) logEvent("🚦 Гонка началась!", "info");
  raf = requestAnimationFrame(loop);
});

pauseBtn.addEventListener("click", () => {
  running = !running;
  pauseBtn.textContent = running ? "Пауза" : "Продолжить";
  if (running) raf = requestAnimationFrame(loop);
});

resetBtn.addEventListener("click", resetAll);
closeModalBtn.addEventListener("click", () => resultsModal.classList.add("hidden"));

lapsInput.addEventListener("change", () => {
  lapsInput.value = clampLaps(parseInt(lapsInput.value, 10) || 20);
});

resetAll();
