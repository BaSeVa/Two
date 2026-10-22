import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Car } from "../Car";
import {
  RACES_LEFT,
  ROUND_POINTS,
  ROUNDS,
  STANDINGS,
  TEAM_COLORS,
} from "../data";
import {
  ASPHALT,
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
  clamp,
} from "../theme";

export const PER_ROUND = 36;
// Доля этапа, за которую строки меняются местами; остаток — пауза
const MOVE = 0.6;
const START = 20;
export const SEASON_END = START + ROUNDS.length * PER_ROUND;
export const SEASON_DURATION = SEASON_END + 60;

const VISIBLE = 10;
const ROW_TOP = 400;
const ROW_H = 118;
const BAR_LEFT = 170;
const BAR_MAX = 590;
const CAR_W = 104;
const GOLD = "#FFD54A";

// Очки нарастающим итогом: CUMULATIVE[code][r] — после r этапов
const CUMULATIVE: Record<string, number[]> = Object.fromEntries(
  STANDINGS.map((d) => {
    const acc = [0];
    for (const p of ROUND_POINTS[d.code]) acc.push(acc[acc.length - 1] + p);
    return [d.code, acc];
  }),
);

// Место после r этапов; при равенстве очков — порядок итоговой таблицы FIA
const RANKS: Record<string, number>[] = Array.from(
  { length: ROUNDS.length + 1 },
  (_, r) => {
    const sorted = [...STANDINGS].sort(
      (a, b) => CUMULATIVE[b.code][r] - CUMULATIVE[a.code][r] || a.pos - b.pos,
    );
    return Object.fromEntries(sorted.map((d, i) => [d.code, i]));
  },
);

const ease = Easing.bezier(0.45, 0, 0.25, 1);

const timeline = (frame: number) => {
  const t = Math.min(ROUNDS.length, Math.max(0, (frame - START) / PER_ROUND));
  const r = Math.min(ROUNDS.length - 1, Math.floor(t));
  return { t, r, e: ease(Math.min(1, (t - r) / MOVE)) };
};

const valueAt = (code: string, frame: number) => {
  const { r, e } = timeline(frame);
  const c = CUMULATIVE[code];
  return c[r] + (c[r + 1] - c[r]) * e;
};

const rankAt = (code: string, frame: number) => {
  const { r, e } = timeline(frame);
  return RANKS[r][code] + (RANKS[r + 1][code] - RANKS[r][code]) * e;
};

export const Season: React.FC = () => {
  const frame = useCurrentFrame();
  const { t } = timeline(frame);
  const round = Math.max(1, Math.ceil(t - 0.001));
  const scaleMax = Math.max(
    25,
    ...STANDINGS.map((d) => valueAt(d.code, frame)),
  );
  const done = frame >= SEASON_END;
  const labelPulse = interpolate(
    (frame - START) % PER_ROUND,
    [0, 4, 10],
    [1.12, 1.12, 1],
    clamp,
  );

  return (
    <AbsoluteFill name="Season">
      <RaceBackground speed={done ? 0.4 : 2} />

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>
          ЭТАП ЗА ЭТАПОМ
        </RedTag>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            fontStyle: "italic",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800, color: MUTED }}>
            ЭТАП {round}/{ROUNDS.length}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              textTransform: "uppercase",
              scale: labelPulse,
              transformOrigin: "left center",
            }}
          >
            {ROUNDS[round - 1]}
          </div>
        </div>
      </AbsoluteFill>

      {STANDINGS.map((d) => {
        const y = rankAt(d.code, frame);
        if (y > VISIBLE + 0.5) return null;
        const value = valueAt(d.code, frame);
        const len = (value / scaleMax) * BAR_MAX;
        const color = TEAM_COLORS[d.team];
        const isLeader = Math.round(y) === 0;
        return (
          <div
            key={d.code}
            style={{
              position: "absolute",
              left: 0,
              top: ROW_TOP + y * ROW_H,
              width: 1080,
              height: ROW_H,
              fontFamily: FONT,
              color: TEXT,
              opacity: interpolate(y, [VISIBLE - 0.6, VISIBLE], [1, 0], clamp),
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 18,
                width: 100,
                textAlign: "center",
                fontSize: 70,
                fontWeight: 900,
                fontStyle: "italic",
                color: isLeader ? GOLD : TEXT,
              }}
            >
              {Math.round(y) + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 2,
                display: "flex",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  fontStyle: "italic",
                  textTransform: "uppercase",
                }}
              >
                {d.lastName}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: "uppercase",
                }}
              >
                {d.team}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 54,
                width: BAR_MAX + CAR_W,
                height: 52,
                backgroundColor: ASPHALT,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 54,
                width: len,
                height: 52,
                background: `linear-gradient(90deg, ${color}22, ${color}cc)`,
              }}
            />
            <div
              style={{ position: "absolute", left: BAR_LEFT + len, top: 60 }}
            >
              <Car color={color} width={CAR_W} />
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT + len + CAR_W + 14,
                top: 52,
                fontSize: 48,
                fontWeight: 900,
                fontStyle: "italic",
                fontVariantNumeric: "tabular-nums",
                color: isLeader ? GOLD : TEXT,
              }}
            >
              {Math.round(value)}
            </div>
          </div>
        );
      })}

      <AbsoluteFill name="Progress" style={{ top: 1640, left: 80 }}>
        <div
          style={{
            position: "absolute",
            top: 26,
            width: 920,
            height: 6,
            backgroundColor: "#2c2d36",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 26,
            width: (t / ROUNDS.length) * 920,
            height: 6,
            backgroundColor: RED,
          }}
        />
        {ROUNDS.map((name, i) => (
          <div
            key={name}
            style={{
              position: "absolute",
              left: ((i + 1) / ROUNDS.length) * 920 - 9,
              top: 20,
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: t >= i + 1 ? RED : "#2c2d36",
              border: "3px solid #0B0B10",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 70,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
          }}
        >
          СЕЗОН 2026 · ОСТАЛОСЬ {RACES_LEFT} ЭТАПОВ
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
