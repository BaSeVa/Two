"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
const TRACK_CENTER = { x: 450, y: 225 };

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

const TRACK_NAMES = [
  "Автодром Аврора",
  "Кольцо Норд-Бэй",
  "Трасса Сан-Ремо",
  "Автодром Кастелло",
  "Кольцо Вермилион",
  "Трасса Дюн-Гарден",
  "Автодром Сильвер-Крик",
  "Кольцо Обсидиан",
  "Трасса Монте-Верде",
  "Автодром Лазурный Берег",
  "Кольцо Пантеон",
  "Трасса Ред-Дюн",
];

const TICKS_PER_LAP = 220;
const MAX_TICKS_SAFETY = 200000;
const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Pit lane speed limit as a fraction of racing pace (real F1 pit limit is far
// slower than track speed, e.g. ~60km/h vs ~300km/h) — driving the lane at
// this pace, plus a stationary tire-change, is what makes up a pit stop.
const PIT_LANE_SPEED_LIMIT = 0.42;
const PIT_STOP_MIN_TICKS = 16;
const PIT_STOP_MAX_TICKS = 26;
const SLOW_PIT_STOP_CHANCE = 0.12;

const TIRE_COMPOUNDS = {
  soft: { code: "S", name: "Мягкая", color: "#ff3b3b", text: "#ffffff", pace: 1.035, wearMul: 1.55 },
  medium: { code: "M", name: "Средняя", color: "#f5c518", text: "#111111", pace: 1.0, wearMul: 1.0 },
  hard: { code: "H", name: "Жёсткая", color: "#eef0f4", text: "#111111", pace: 0.975, wearMul: 0.68 },
  wet: { code: "W", name: "Дождевая", color: "#1e90ff", text: "#ffffff", pace: 0.97, wearMul: 1.0 },
};

let config = null;
let roster = null;
let season = null;
let state = null;
let svgEls = {};
let running = false;
let raf = null;
let lastTrackName = null;

const el = (id) => document.getElementById(id);
const teamsInput = el("teams-input");
const lapsInput = el("laps-input");
const modeSelect = el("mode-select");
const racesInput = el("races-input");
const racesGroup = el("races-group");
const speedSelect = el("speed-select");
const startBtn = el("start-btn");
const pauseBtn = el("pause-btn");
const resetBtn = el("reset-btn");
const weatherIndicator = el("weather-indicator");
const raceIndicatorEl = el("race-indicator");
const trackNameEl = el("track-name");
const lapCounterEl = el("lap-counter");
const leaderboardBody = el("leaderboard-body");
const raceLogEl = el("race-log");
const championshipPanel = el("championship-panel");
const driversStandingsBody = el("drivers-standings-body");
const constructorsStandingsBody = el("constructors-standings-body");
const resultsModal = el("results-modal");
const resultsTitleEl = el("results-title");
const podiumEl = el("podium");
const resultsBody = el("results-body");
const nextRaceBtn = el("next-race-btn");
const closeModalBtn = el("close-modal-btn");

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function gaussian() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function clampLaps(v) {
  return Math.min(70, Math.max(3, v));
}

/* ---------- Track generation ---------- */

function generateTrackPoints() {
  const baseRx = rand(230, 300);
  const baseRy = rand(120, 170);
  const n = Math.floor(rand(9, 14));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    pts.push({
      x: TRACK_CENTER.x + Math.cos(angle) * baseRx * rand(0.72, 1.18),
      y: TRACK_CENTER.y + Math.sin(angle) * baseRy * rand(0.72, 1.18),
    });
  }
  return pts;
}

function catmullRomClosedPath(pts) {
  const n = pts.length;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}

function pickTrackName() {
  let name = TRACK_NAMES[Math.floor(Math.random() * TRACK_NAMES.length)];
  if (TRACK_NAMES.length > 1) {
    while (name === lastTrackName) {
      name = TRACK_NAMES[Math.floor(Math.random() * TRACK_NAMES.length)];
    }
  }
  lastTrackName = name;
  return name;
}

function createSvgEl(tag, attrs) {
  const node = document.createElementNS(SVGNS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function createSvgPath(d, attrs) {
  return createSvgEl("path", { d, fill: "none", ...attrs });
}

function pointAt(fraction) {
  const len = (((fraction % 1) + 1) % 1) * svgEls.totalLength;
  return svgEls.path.getPointAtLength(len);
}

function loopTangentNormal(fraction) {
  const p1 = pointAt(fraction);
  const p2 = pointAt(fraction + 0.004);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p1.x, y: p1.y, nx: -dy / len, ny: dx / len };
}

function openPathPoint(pathEl, totalLength, fraction) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return pathEl.getPointAtLength(clamped * totalLength);
}

function openPathTangent(pathEl, totalLength, fraction) {
  const p1 = openPathPoint(pathEl, totalLength, fraction);
  const pA = openPathPoint(pathEl, totalLength, Math.max(fraction - 0.01, 0));
  const pB = openPathPoint(pathEl, totalLength, Math.min(fraction + 0.01, 1));
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p1.x, y: p1.y, nx: -dy / len, ny: dx / len };
}

function computePitLane(entryFrac, exitFrac) {
  const pEntry = pointAt(entryFrac);
  const pExit = pointAt(exitFrac);
  const mid = { x: (pEntry.x + pExit.x) / 2, y: (pEntry.y + pExit.y) / 2 };
  const inward = normalize({ x: TRACK_CENTER.x - mid.x, y: TRACK_CENTER.y - mid.y });
  const offset = 50;
  const q1 = {
    x: pEntry.x * 0.65 + pExit.x * 0.35 + inward.x * offset,
    y: pEntry.y * 0.65 + pExit.y * 0.35 + inward.y * offset,
  };
  const q2 = {
    x: pEntry.x * 0.35 + pExit.x * 0.65 + inward.x * offset,
    y: pEntry.y * 0.35 + pExit.y * 0.65 + inward.y * offset,
  };
  const d = `M${pEntry.x.toFixed(1)},${pEntry.y.toFixed(1)} C${q1.x.toFixed(1)},${q1.y.toFixed(1)} ${q2.x.toFixed(1)},${q2.y.toFixed(1)} ${pExit.x.toFixed(1)},${pExit.y.toFixed(1)}`;
  return { d, entryPoint: pEntry, exitPoint: pExit };
}

function buildTrack() {
  const svg = el("track-svg");
  svg.innerHTML = "";
  svgEls = {};

  const defs = createSvgEl("defs", {});
  defs.innerHTML = `
    <pattern id="checker" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#fff"/>
      <rect width="3.5" height="3.5" fill="#111"/>
      <rect x="3.5" y="3.5" width="3.5" height="3.5" fill="#111"/>
    </pattern>`;
  svg.appendChild(defs);

  const points = generateTrackPoints();
  const mainD = catmullRomClosedPath(points);

  const asphalt = createSvgPath(mainD, { stroke: "#33363f", "stroke-width": 34, "stroke-linejoin": "round" });
  svg.appendChild(asphalt);
  svgEls.path = asphalt;
  svgEls.totalLength = asphalt.getTotalLength();

  const kerb = createSvgPath(mainD, { stroke: "#4a4e5a", "stroke-width": 34, "stroke-dasharray": "2 22", opacity: "0.5" });
  svg.appendChild(kerb);

  const centerline = createSvgPath(mainD, { stroke: "#ffffff", "stroke-width": 2, "stroke-dasharray": "8 10", opacity: "0.35" });
  svg.appendChild(centerline);

  const entryFrac = rand(0.78, 0.92);
  const exitFrac = rand(0.04, 0.14);
  const pit = computePitLane(entryFrac, exitFrac);

  const pitAsphalt = createSvgPath(pit.d, { stroke: "#2c2510", "stroke-width": 16, "stroke-linecap": "round" });
  svg.appendChild(pitAsphalt);
  svgEls.pitPath = pitAsphalt;
  svgEls.pitTotalLength = pitAsphalt.getTotalLength();

  const pitLine = createSvgPath(pit.d, { stroke: "#f5c518", "stroke-width": 1.5, "stroke-dasharray": "5 6", opacity: "0.85" });
  svg.appendChild(pitLine);

  for (let i = 1; i <= 3; i++) {
    const p = openPathPoint(svgEls.pitPath, svgEls.pitTotalLength, i / 4);
    svg.appendChild(
      createSvgEl("rect", {
        x: p.x - 9,
        y: p.y - 5,
        width: 18,
        height: 10,
        rx: 2,
        fill: "#20242e",
        stroke: "#3a3f4c",
      })
    );
  }

  svg.appendChild(createSvgEl("circle", { cx: pit.entryPoint.x, cy: pit.entryPoint.y, r: 4, fill: "#f5c518", stroke: "#0c0e14", "stroke-width": 1 }));
  svg.appendChild(createSvgEl("circle", { cx: pit.exitPoint.x, cy: pit.exitPoint.y, r: 4, fill: "#3ddc6f", stroke: "#0c0e14", "stroke-width": 1 }));

  const startPoint = pointAt(0);
  const startTangent = loopTangentNormal(0);
  const angleDeg = (Math.atan2(startTangent.ny, startTangent.nx) * 180) / Math.PI;
  svg.appendChild(
    createSvgEl("rect", {
      x: -7,
      y: -17,
      width: 14,
      height: 34,
      fill: "url(#checker)",
      transform: `translate(${startPoint.x},${startPoint.y}) rotate(${angleDeg})`,
    })
  );

  const carGroup = createSvgEl("g", {});
  svg.appendChild(carGroup);
  svgEls.carGroup = carGroup;

  const lengthRatio = svgEls.pitTotalLength / svgEls.totalLength;
  const distanceTicksAtRacePace = lengthRatio * TICKS_PER_LAP;
  const driveTicks = Math.max(20, Math.round(distanceTicksAtRacePace / PIT_LANE_SPEED_LIMIT));

  state.track = {
    name: pickTrackName(),
    pitEntryFrac: entryFrac,
    pitExitFrac: exitFrac,
    pitDriveHalfTicks: Math.round(driveTicks / 2),
  };
  trackNameEl.textContent = state.track.name;

  state.cars.forEach((car) => {
    const g = createSvgEl("g", { id: car.id });
    g.style.opacity = "1";
    const circle = createSvgEl("circle", { r: 7, fill: car.color, stroke: TIRE_COMPOUNDS[car.compound].color, "stroke-width": 2 });
    g.appendChild(circle);
    const label = createSvgEl("text", { "text-anchor": "middle", dy: -10, "font-size": 8, fill: "#e8eaf0" });
    label.textContent = car.number;
    g.appendChild(label);
    carGroup.appendChild(g);
    car.svgGroup = g;
    car.svgCircle = circle;
    updateCarPosition(car, 0);
  });
}

/* ---------- Cars / roster ---------- */

function raceFieldDefaults() {
  return {
    progress: 0,
    lap: 0,
    tireWear: 0,
    pitStops: 0,
    pitting: false,
    pitPhase: null,
    pitPhaseTicksLeft: 0,
    pitStopTicks: 0,
    pitLaneFrac: 0,
    wantsPit: false,
    pitEntryLapFloor: 0,
    prevFrac: 0,
    finished: false,
    dnf: false,
    finishTick: null,
    finishPos: null,
    svgGroup: null,
    svgCircle: null,
  };
}

function pickStartingCompound() {
  return Math.random() < 0.5 ? "medium" : "soft";
}

function pickNextCompound(car) {
  if (state.weather === "rain") return "wet";
  const remainingFrac = 1 - car.lap / state.totalLaps;
  const pool = remainingFrac > 0.45 ? ["soft", "medium", "medium", "hard"] : ["medium", "hard", "hard"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeCars(teamsCount) {
  const chosenTeams = shuffle([...TEAMS]).slice(0, teamsCount);
  const cars = [];
  let number = 1;
  chosenTeams.forEach((team) => {
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
        pitThreshold: rand(0.62, 0.9),
        compound: pickStartingCompound(),
        seasonPoints: 0,
        wins: 0,
        podiums: 0,
        ...raceFieldDefaults(),
      });
      number += 1;
    });
  });
  cars.sort((a, b) => b.skill - a.skill + rand(-0.15, 0.15));
  cars.forEach((c, i) => (c.gridPos = i + 1));
  return cars;
}

function resetCarForRace(car) {
  Object.assign(car, raceFieldDefaults());
  car.stintLaps = rand(6, 13);
  car.pitThreshold = rand(0.62, 0.9);
  car.compound = pickStartingCompound();
}

/* ---------- Config / season lifecycle ---------- */

function readConfig() {
  return {
    teamsCount: Math.min(10, Math.max(2, parseInt(teamsInput.value, 10) || 10)),
    lapsPerRace: clampLaps(parseInt(lapsInput.value, 10) || 20),
    seasonMode: modeSelect.value === "season",
    totalRaces: Math.min(16, Math.max(2, parseInt(racesInput.value, 10) || 5)),
  };
}

function setControlsDisabled(disabled) {
  [teamsInput, lapsInput, modeSelect, racesInput].forEach((elm) => (elm.disabled = disabled));
}

function initSeason() {
  config = readConfig();
  roster = makeCars(config.teamsCount);
  season = {
    active: config.seasonMode,
    raceIndex: 1,
    totalRaces: config.seasonMode ? config.totalRaces : 1,
  };
  startNewRace();
  updateRaceIndicator();
}

function startNewRace() {
  roster.forEach(resetCarForRace);
  state = {
    cars: roster,
    totalLaps: config.lapsPerRace,
    tick: 0,
    weather: "dry",
    weatherTicksLeft: Math.floor(rand(400, 900)),
    finishedCount: 0,
    raceOver: false,
    lastOrder: [],
    track: null,
  };
  buildTrack();
  render();
}

function updateRaceIndicator() {
  if (season.active) {
    raceIndicatorEl.textContent = `Гонка ${season.raceIndex} / ${season.totalRaces}`;
    raceIndicatorEl.classList.remove("hidden");
    championshipPanel.classList.remove("hidden");
  } else {
    raceIndicatorEl.classList.add("hidden");
    championshipPanel.classList.add("hidden");
  }
}

/* ---------- Simulation ---------- */

function weatherSpeedFactor(car) {
  if (state.weather === "dry") return 1;
  return 0.8 * car.wetSkill;
}

function logEvent(message, type = "info") {
  const entry = document.createElement("div");
  entry.className = `log-entry event-${type}`;
  entry.textContent = message;
  raceLogEl.appendChild(entry);
  while (raceLogEl.children.length > 150) {
    raceLogEl.removeChild(raceLogEl.firstChild);
  }
  raceLogEl.scrollTop = raceLogEl.scrollHeight;
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
      state.cars.forEach((c) => {
        if (!c.finished && !c.dnf && !c.pitting && c.compound !== "wet") c.wantsPit = true;
      });
    } else if (state.weather === "dry" && wasRain) {
      logEvent("☀️ Дождь прекратился, трасса подсыхает.", "weather");
      state.cars.forEach((c) => {
        if (!c.finished && !c.dnf && !c.pitting && c.compound === "wet") c.wantsPit = true;
      });
    }
  }

  const activeCars = state.cars.filter((c) => !c.finished && !c.dnf);

  activeCars.forEach((car) => {
    if (car.pitting) {
      car.pitPhaseTicksLeft -= 1;
      const halfTicks = state.track.pitDriveHalfTicks;

      if (car.pitPhase === "in") {
        car.pitLaneFrac = 0.5 * (1 - Math.max(car.pitPhaseTicksLeft, 0) / halfTicks);
        if (car.pitPhaseTicksLeft <= 0) {
          car.pitPhase = "stopped";
          car.pitPhaseTicksLeft = car.pitStopTicks;
          car.pitLaneFrac = 0.5;
          const oldCompound = TIRE_COMPOUNDS[car.compound];
          car.compound = pickNextCompound(car);
          car.tireWear = 0;
          if (car.svgCircle) car.svgCircle.setAttribute("stroke", TIRE_COMPOUNDS[car.compound].color);
          logEvent(`🛞 ${car.name}: механики меняют шины ${oldCompound.code} → ${TIRE_COMPOUNDS[car.compound].code}.`, "pit");
        }
      } else if (car.pitPhase === "stopped") {
        if (car.pitPhaseTicksLeft <= 0) {
          car.pitPhase = "out";
          car.pitPhaseTicksLeft = halfTicks;
          logEvent(`🚦 ${car.name} покидает бокс под ограничением скорости пит-лейн.`, "pit");
        }
      } else {
        car.pitLaneFrac = 0.5 + 0.5 * (1 - Math.max(car.pitPhaseTicksLeft, 0) / halfTicks);
        if (car.pitPhaseTicksLeft <= 0) {
          car.pitting = false;
          car.pitPhase = null;
          car.pitLaneFrac = 0;
          car.progress = car.pitEntryLapFloor + 1 + state.track.pitExitFrac;
          car.lap = Math.floor(car.progress);
          car.prevFrac = car.progress - car.lap;
          logEvent(`🏁 ${car.name} (${car.team}) возвращается на трассу.`, "pit");
        }
      }
      return;
    }

    if (Math.random() > car.reliability) {
      car.dnf = true;
      logEvent(`💥 Сход! ${car.name} (${car.team}) остановился из-за поломки.`, "dnf");
      return;
    }

    const compound = TIRE_COMPOUNDS[car.compound];
    const wetMismatch = state.weather === "rain" && car.compound !== "wet";
    const dryMismatch = state.weather !== "rain" && car.compound === "wet";
    const paceMismatchFactor = wetMismatch ? 0.72 : dryMismatch ? 0.85 : 1;
    const wearMismatchFactor = wetMismatch ? 1.7 : dryMismatch ? 1.5 : 1;

    const base = 1 / TICKS_PER_LAP;
    const wearPenalty = 1 - car.tireWear * 0.35;
    const weatherFactor = weatherSpeedFactor(car);
    const noise = 1 + gaussian() * (0.12 * (1.15 - car.consistency));
    const speed = base * car.skill * wearPenalty * weatherFactor * compound.pace * paceMismatchFactor * Math.max(noise, 0.4);

    car.progress += speed;
    const wearRate = (base / car.stintLaps) * compound.wearMul * wearMismatchFactor;
    car.tireWear = Math.min(1, car.tireWear + wearRate);

    const newLap = Math.floor(car.progress);
    if (newLap > car.lap) car.lap = newLap;

    if (car.tireWear >= car.pitThreshold && !car.wantsPit && car.lap < state.totalLaps - 1) {
      car.wantsPit = true;
    }

    const frac = car.progress - Math.floor(car.progress);
    if (car.wantsPit && car.prevFrac < state.track.pitEntryFrac && frac >= state.track.pitEntryFrac) {
      car.pitting = true;
      car.wantsPit = false;
      car.pitPhase = "in";
      car.pitPhaseTicksLeft = state.track.pitDriveHalfTicks;
      car.pitLaneFrac = 0;
      car.pitEntryLapFloor = Math.floor(car.progress);
      car.pitStops += 1;
      const isSlow = Math.random() < SLOW_PIT_STOP_CHANCE;
      car.pitStopTicks = Math.round(rand(PIT_STOP_MIN_TICKS, PIT_STOP_MAX_TICKS) * (isSlow ? rand(1.6, 2.2) : 1));
      logEvent(
        `🔧 ${car.name} (${car.team}) заезжает в пит-лейн (пит-стоп #${car.pitStops}).${isSlow ? " ⚠️ Проблема на пит-стопе!" : ""}`,
        "pit"
      );
    }
    car.prevFrac = frac;

    if (car.lap >= state.totalLaps && !car.finished) {
      car.finished = true;
      car.finishTick = state.tick;
      state.finishedCount += 1;
      car.finishPos = state.finishedCount;
      const posLabel =
        car.finishPos === 1 ? "🥇 Победа!" : car.finishPos === 2 ? "🥈" : car.finishPos === 3 ? "🥉" : `P${car.finishPos}`;
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

/* ---------- Rendering ---------- */

function updateCarPosition(car, laneIndex) {
  if (!car.svgGroup) return;
  let t;
  let lane;
  if (car.pitting) {
    t = openPathTangent(svgEls.pitPath, svgEls.pitTotalLength, car.pitLaneFrac);
    lane = ((laneIndex % 3) - 1) * 4;
  } else {
    t = loopTangentNormal(car.progress);
    lane = ((laneIndex % 5) - 2) * 5.5;
  }
  const x = t.x + t.nx * lane;
  const y = t.y + t.ny * lane;
  car.svgGroup.setAttribute("transform", `translate(${x},${y})`);
}

function render() {
  const order = currentOrder();

  order.forEach((id, idx) => {
    const car = state.cars.find((c) => c.id === id);
    if (!car.finished) {
      updateCarPosition(car, idx);
    } else if (car.svgGroup) {
      car.svgGroup.style.opacity = "0.35";
    }
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
    else if (car.pitting) {
      const phaseLabel = car.pitPhase === "in" ? "Въезд в пит-лейн" : car.pitPhase === "stopped" ? "Смена шин" : "Выезд из пит-лейн";
      status = `${phaseLabel} (${Math.ceil(car.pitPhaseTicksLeft / 10)}с)`;
    } else status = `Круг ${Math.min(car.lap + 1, state.totalLaps)}/${state.totalLaps}`;

    const wearPct = Math.round(car.tireWear * 100);
    const wearColor = wearPct > 75 ? "var(--bad)" : wearPct > 45 ? "var(--warn)" : "var(--good)";
    const compound = TIRE_COMPOUNDS[car.compound];

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><span class="team-dot" style="background:${car.color}"></span>${car.name}</td>
      <td>${car.team}</td>
      <td>${status}</td>
      <td>
        <span class="tire-compound" style="background:${compound.color};color:${compound.text}" title="${compound.name}">${compound.code}</span>
        <span class="tire-bar"><span class="tire-bar-fill" style="width:${wearPct}%;background:${wearColor}"></span></span>
      </td>
    `;
    leaderboardBody.appendChild(tr);
  });

  const leader = state.cars.find((c) => c.id === order[0]);
  lapCounterEl.textContent = `Круг ${Math.min((leader?.lap ?? 0) + 1, state.totalLaps)} / ${state.totalLaps}`;
  weatherIndicator.textContent = state.weather === "rain" ? "🌧️ Дождь" : "☀️ Сухо";
}

function renderStandings() {
  if (!season.active) return;

  const sortedDrivers = [...state.cars].sort((a, b) => b.seasonPoints - a.seasonPoints);
  driversStandingsBody.innerHTML = "";
  sortedDrivers.forEach((car, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx + 1}</td><td><span class="team-dot" style="background:${car.color}"></span>${car.name}</td><td>${car.team}</td><td>${car.seasonPoints}</td>`;
    driversStandingsBody.appendChild(tr);
  });

  const constructorPoints = {};
  const constructorColor = {};
  state.cars.forEach((car) => {
    constructorPoints[car.team] = (constructorPoints[car.team] || 0) + car.seasonPoints;
    constructorColor[car.team] = car.color;
  });
  const sortedTeams = Object.entries(constructorPoints).sort((a, b) => b[1] - a[1]);
  constructorsStandingsBody.innerHTML = "";
  sortedTeams.forEach(([team, pts], idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx + 1}</td><td><span class="team-dot" style="background:${constructorColor[team]}"></span>${team}</td><td>${pts}</td>`;
    constructorsStandingsBody.appendChild(tr);
  });
}

/* ---------- Loop / lifecycle ---------- */

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

  const finalOrder = currentOrder().map((id) => state.cars.find((c) => c.id === id));

  if (season.active) {
    finalOrder.forEach((car) => {
      if (car.finished) {
        const pts = POINTS_TABLE[car.finishPos - 1] || 0;
        car.seasonPoints += pts;
        if (car.finishPos === 1) car.wins += 1;
        if (car.finishPos <= 3) car.podiums += 1;
      }
    });
  }

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
    const result = car.dnf ? "DNF" : car.finished ? `${car.pitStops} пит-стопов` : "—";
    const pts = season.active ? (car.finished ? POINTS_TABLE[car.finishPos - 1] || 0 : 0) : "—";
    tr.innerHTML = `<td>${car.dnf ? "DNF" : idx + 1}</td><td>${car.name}</td><td>${car.team}</td><td>${result}</td><td>${pts}</td>`;
    resultsBody.appendChild(tr);
  });

  const isFinalRace = season.active && season.raceIndex >= season.totalRaces;
  resultsTitleEl.textContent = isFinalRace
    ? "🏆 Финал сезона!"
    : season.active
    ? `🏁 Результаты гонки ${season.raceIndex}/${season.totalRaces}`
    : "🏆 Результаты гонки";

  nextRaceBtn.classList.toggle("hidden", !(season.active && !isFinalRace));

  renderStandings();
  resultsModal.classList.remove("hidden");

  logEvent(`🏁 Гонка завершена!${season.active ? ` (${season.raceIndex}/${season.totalRaces})` : ""}`, "finish");
  if (isFinalRace) {
    const champion = [...state.cars].sort((a, b) => b.seasonPoints - a.seasonPoints)[0];
    logEvent(`🏆 Чемпион сезона: ${champion.name} (${champion.team}) — ${champion.seasonPoints} очков!`, "finish");
  }
}

function resetAll() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raceLogEl.innerHTML = "";
  resultsModal.classList.add("hidden");
  initSeason();
  renderStandings();
  startBtn.disabled = false;
  startBtn.textContent = "Старт";
  pauseBtn.disabled = true;
  pauseBtn.textContent = "Пауза";
  setControlsDisabled(false);
  logEvent(
    `🏎️ ${state.track.name}: стартовая решётка готова. ${state.totalLaps} кругов, ${state.cars.length} пилотов.${
      season.active ? ` Сезон: ${season.totalRaces} гонок.` : ""
    }`,
    "info"
  );
}

/* ---------- Event wiring ---------- */

startBtn.addEventListener("click", () => {
  if (state.raceOver) return;
  running = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  setControlsDisabled(true);
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

nextRaceBtn.addEventListener("click", () => {
  resultsModal.classList.add("hidden");
  season.raceIndex += 1;
  startNewRace();
  updateRaceIndicator();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  startBtn.textContent = "Старт";
  logEvent(`🏎️ ${state.track.name}: стартовая решётка готова для гонки ${season.raceIndex}/${season.totalRaces}.`, "info");
});

lapsInput.addEventListener("change", () => {
  lapsInput.value = clampLaps(parseInt(lapsInput.value, 10) || 20);
});

modeSelect.addEventListener("change", () => {
  racesGroup.classList.toggle("hidden", modeSelect.value !== "season");
});

racesGroup.classList.toggle("hidden", modeSelect.value !== "season");

resetAll();
