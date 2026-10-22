import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ROUND_POINTS, ROUNDS, STANDINGS, TEAM_COLORS } from "../data";
import { Backdrop } from "../KlingClip";
import { Aerial3D } from "../three/Backdrops";
import { FONT, MUTED, RaceBackground, RedTag, TEXT, clamp } from "../theme";

export const TREND_DURATION = 270;
const DRAW_START = 20;
const DRAW_END = 200;

const TOP = STANDINGS.slice(0, 6);
const CHART_LEFT = 140;
const CHART_RIGHT = 770;
const CHART_TOP = 420;
const CHART_BOTTOM = 1500;
const Y_MAX = 350;
const LABEL_GAP = 42;

const cumulative = (code: string) => {
  const acc = [0];
  for (const p of ROUND_POINTS[code]) acc.push(acc[acc.length - 1] + p);
  return acc;
};
const SERIES = TOP.map((d) => ({ driver: d, values: cumulative(d.code) }));

const xOf = (r: number) =>
  CHART_LEFT + (r / ROUNDS.length) * (CHART_RIGHT - CHART_LEFT);
const yOf = (v: number) =>
  CHART_BOTTOM - (v / Y_MAX) * (CHART_BOTTOM - CHART_TOP);

// Второй пилот команды рисуется пунктиром, чтобы не путать напарников
const isSecondInTeam = (code: string) => {
  const d = TOP.find((x) => x.code === code)!;
  return TOP.findIndex((x) => x.team === d.team) !== TOP.indexOf(d);
};

export const Trend: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [DRAW_START, DRAW_END], [0, ROUNDS.length], {
    ...clamp,
    easing: Easing.bezier(0.3, 0, 0.3, 1),
  });
  const whole = Math.floor(p);
  const frac = p - whole;

  const heads = SERIES.map(({ driver, values }) => {
    const v =
      whole >= ROUNDS.length
        ? values[ROUNDS.length]
        : values[whole] + (values[whole + 1] - values[whole]) * frac;
    return { driver, values, v, x: xOf(p), y: yOf(v) };
  });

  // Подписи у концов линий раздвигаются, чтобы не наезжать друг на друга
  const labels = [...heads].sort((a, b) => a.y - b.y);
  const labelY: Record<string, number> = {};
  let prev = -Infinity;
  for (const h of labels) {
    const y = Math.max(h.y, prev + LABEL_GAP);
    labelY[h.driver.code] = y;
    prev = y;
  }

  return (
    <AbsoluteFill name="Trend">
      <RaceBackground speed={0.7} />
      <Backdrop opacity={0.3}>
        <Aerial3D />
      </Backdrop>

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>
          ГРАФИК СЕЗОНА
        </RedTag>
        <div
          style={{
            marginTop: 22,
            fontSize: 40,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            letterSpacing: 2,
          }}
        >
          ОЧКИ НАРАСТАЮЩИМ ИТОГОМ · ТОП-6
        </div>
      </AbsoluteFill>

      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0, 100, 200, 300].map((v) => (
          <g key={v}>
            <line
              x1={CHART_LEFT}
              x2={CHART_RIGHT}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="#2c2d36"
              strokeWidth={2}
            />
            <text
              x={CHART_LEFT - 18}
              y={yOf(v) + 9}
              textAnchor="end"
              fill={MUTED}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={26}
            >
              {v}
            </text>
          </g>
        ))}
        {[1, 5, 10, 15, 17].map((r) => (
          <text
            key={r}
            x={xOf(r)}
            y={CHART_BOTTOM + 44}
            textAnchor="middle"
            fill={MUTED}
            fontFamily={FONT}
            fontWeight={700}
            fontSize={26}
          >
            {r}
          </text>
        ))}
        <text
          x={CHART_LEFT}
          y={CHART_BOTTOM + 92}
          fill={MUTED}
          fontFamily={FONT}
          fontWeight={700}
          fontSize={26}
        >
          ЭТАПЫ: {ROUNDS[0].toUpperCase()} →{" "}
          {ROUNDS[ROUNDS.length - 1].toUpperCase()}
        </text>

        {heads
          .slice()
          .reverse()
          .map(({ driver, values, x, y }) => {
            const pts = values
              .slice(0, whole + 1)
              .map((v, r) => `${xOf(r)},${yOf(v)}`);
            pts.push(`${x},${y}`);
            const color = TEAM_COLORS[driver.team];
            return (
              <g key={driver.code}>
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={7}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={
                    isSecondInTeam(driver.code) ? "16 10" : undefined
                  }
                />
                <circle
                  cx={x}
                  cy={y}
                  r={11}
                  fill={color}
                  stroke="#0B0B10"
                  strokeWidth={4}
                />
                <line
                  x1={x + 12}
                  y1={y}
                  x2={CHART_RIGHT + 22}
                  y2={labelY[driver.code]}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.6}
                />
              </g>
            );
          })}
      </svg>

      {heads.map(({ driver, v }) => (
        <div
          key={driver.code}
          style={{
            position: "absolute",
            left: CHART_RIGHT + 28,
            top: labelY[driver.code] - 20,
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 900,
            fontStyle: "italic",
            color: TEXT,
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            borderLeft: `6px solid ${TEAM_COLORS[driver.team]}`,
            paddingLeft: 10,
          }}
        >
          {driver.lastName}{" "}
          <span style={{ color: driver.pos === 1 ? "#FFD54A" : MUTED }}>
            {Math.round(v)}
          </span>
        </div>
      ))}
    </AbsoluteFill>
  );
};
