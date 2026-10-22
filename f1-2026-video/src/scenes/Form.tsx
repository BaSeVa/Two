import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Car } from "../Car";
import { Backdrop } from "../KlingClip";
import { Overtake3D } from "../three/Backdrops";
import { ROUND_POINTS, ROUNDS, STANDINGS, TEAM_COLORS } from "../data";
import {
  ASPHALT,
  FONT,
  MUTED,
  RaceBackground,
  RedTag,
  TEXT,
  clamp,
} from "../theme";

export const FORM_DURATION = 240;
const LAST = 5;
const SHOWN = 8;
const ROW_TOP = 430;
const ROW_H = 130;
const BAR_LEFT = 170;
const BAR_MAX = 600;
const CAR_W = 96;
const GOLD = "#FFD54A";

// Очки за последние LAST этапов
const FORM = STANDINGS.map((d) => ({
  driver: d,
  points: ROUND_POINTS[d.code].slice(-LAST).reduce((a, b) => a + b, 0),
}))
  .sort((a, b) => b.points - a.points || a.driver.pos - b.driver.pos)
  .slice(0, SHOWN);
const FORM_COLORS = FORM.slice(0, 4).map((f) => TEAM_COLORS[f.driver.team]);
const MAX = FORM[0].points;
const FIRST_ROUND = ROUNDS[ROUNDS.length - LAST];
const LAST_ROUND = ROUNDS[ROUNDS.length - 1];

export const Form: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Form">
      <RaceBackground speed={1.2} />
      <Backdrop opacity={0.35}>
        <Overtake3D colors={FORM_COLORS} />
      </Backdrop>

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>
          КТО В ФОРМЕ
        </RedTag>
        <div
          style={{
            marginTop: 22,
            fontSize: 40,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Очки за {LAST} этапов: {FIRST_ROUND} → {LAST_ROUND}
        </div>
      </AbsoluteFill>

      {FORM.map(({ driver, points }, i) => {
        const grow = interpolate(frame, [16 + i * 6, 76 + i * 6], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.3, 0, 0.2, 1),
        });
        const len = (points / MAX) * BAR_MAX * grow;
        const color = TEAM_COLORS[driver.team];
        const best = i === 0;
        return (
          <div
            key={driver.code}
            style={{
              position: "absolute",
              top: ROW_TOP + i * ROW_H,
              left: 0,
              width: 1080,
              height: ROW_H,
              fontFamily: FONT,
              color: TEXT,
              opacity: interpolate(frame, [i * 4, i * 4 + 10], [0, 1], clamp),
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 22,
                width: 100,
                textAlign: "center",
                fontSize: 70,
                fontWeight: 900,
                fontStyle: "italic",
                color: best ? GOLD : TEXT,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 4,
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
                {driver.lastName}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: "uppercase",
                }}
              >
                {driver.team} · P{driver.pos} в зачёте
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 58,
                width: BAR_MAX + CAR_W,
                height: 54,
                backgroundColor: ASPHALT,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT,
                top: 58,
                width: len,
                height: 54,
                background: `linear-gradient(90deg, ${color}22, ${color}dd)`,
              }}
            />
            <div
              style={{ position: "absolute", left: BAR_LEFT + len, top: 66 }}
            >
              <Car color={color} width={CAR_W} />
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_LEFT + len + CAR_W + 14,
                top: 56,
                fontSize: 48,
                fontWeight: 900,
                fontStyle: "italic",
                fontVariantNumeric: "tabular-nums",
                color: best ? GOLD : TEXT,
              }}
            >
              {Math.round(points * grow)}
            </div>
          </div>
        );
      })}

      <AbsoluteFill
        name="Verdict"
        style={{
          top: ROW_TOP + SHOWN * ROW_H + 40,
          alignItems: "center",
          opacity: interpolate(frame, [120, 136], [0, 1], clamp),
          scale: interpolate(frame, [120, 136], [0.85, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 46,
            fontWeight: 900,
            fontStyle: "italic",
            color: GOLD,
            textTransform: "uppercase",
          }}
        >
          {FORM[0].driver.lastName} — лучший за {LAST} этапов
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
