import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Car } from "../Car";
import { STANDINGS, TEAM_COLORS } from "../data";
import { FONT, MUTED, RaceBackground, RedTag, TEXT, clamp } from "../theme";
import { KlingClip } from "../KlingClip";

export const PODIUM_DURATION = 200;

const BASE_Y = 1560;
const SLOTS = [
  { pos: 2, left: 60, height: 380, delay: 14 },
  { pos: 1, left: 380, height: 540, delay: 28 },
  { pos: 3, left: 700, height: 290, delay: 0 },
];
const BLOCK_W = 320;
const GOLD = "#FFD54A";
const MEDAL = ["#FFD54A", "#D7DCE2", "#E39A5B"];

export const Podium: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Podium">
      <RaceBackground speed={0.5} />
      <KlingClip id="champagne" opacity={0.4} />

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>ТОП-3</RedTag>
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
          БОРЬБА ЗА КУБОК ПИЛОТОВ
        </div>
      </AbsoluteFill>

      {SLOTS.map((s) => {
        const d = STANDINGS[s.pos - 1];
        const color = TEAM_COLORS[d.team];
        const rise = interpolate(frame, [s.delay, s.delay + 22], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const labelIn = interpolate(
          frame,
          [s.delay + 14, s.delay + 28],
          [0, 1],
          clamp,
        );
        const h = s.height * rise;
        return (
          <React.Fragment key={d.code}>
            <div
              style={{
                position: "absolute",
                left: s.left + 8,
                width: BLOCK_W - 16,
                top: BASE_Y - h,
                height: h,
                background: `linear-gradient(180deg, ${color} 0 14px, #1d1e26 14px)`,
                borderLeft: "2px solid #34353f",
                borderRight: "2px solid #34353f",
                display: "flex",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  marginTop: 30,
                  fontFamily: FONT,
                  fontSize: 200,
                  lineHeight: 1,
                  fontWeight: 900,
                  fontStyle: "italic",
                  color: MEDAL[s.pos - 1],
                }}
              >
                {s.pos}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: s.left,
                width: BLOCK_W,
                top: BASE_Y - s.height - 290,
                height: 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: FONT,
                color: TEXT,
                opacity: labelIn,
                translate: `0px ${(1 - labelIn) * 40}px`,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 116,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ rotate: "-90deg", display: "flex" }}>
                  <Car color={color} width={110} />
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>
                {d.firstName}
              </div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  fontStyle: "italic",
                  textTransform: "uppercase",
                }}
              >
                {d.lastName}
              </div>
              <div
                style={{
                  fontSize: 50,
                  fontWeight: 900,
                  fontStyle: "italic",
                  color: s.pos === 1 ? GOLD : TEXT,
                }}
              >
                {d.points}
                <span style={{ fontSize: 28, color: MUTED }}> ОЧК.</span>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: BASE_Y,
          height: 8,
          backgroundColor: "#34353f",
        }}
      />

      <AbsoluteFill
        name="Gaps"
        style={{
          top: BASE_Y + 60,
          alignItems: "center",
          fontFamily: FONT,
          color: TEXT,
          opacity: interpolate(frame, [60, 74], [0, 1], clamp),
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, fontStyle: "italic" }}>
          {STANDINGS[1].lastName}{" "}
          <span style={{ color: MUTED }}>
            −{STANDINGS[0].points - STANDINGS[1].points}
          </span>
          {"  ·  "}
          {STANDINGS[2].lastName}{" "}
          <span style={{ color: MUTED }}>
            −{STANDINGS[0].points - STANDINGS[2].points}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
