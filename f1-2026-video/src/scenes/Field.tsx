import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { STANDINGS, TEAM_COLORS } from "../data";
import { FONT, MUTED, RaceBackground, RedTag, TEXT, clamp } from "../theme";

export const FIELD_DURATION = 150;

const REST = STANDINGS.slice(10);
const ROW_TOP = 330;
const ROW_H = 102;

export const Field: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Field">
      <RaceBackground speed={0.8} />

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>
          ПЕЛОТОН
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
          ПОЗИЦИИ 11–{STANDINGS.length}
        </div>
      </AbsoluteFill>

      {REST.map((d, i) => {
        const appear = interpolate(frame, [6 + i * 4, 22 + i * 4], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        return (
          <div
            key={d.code}
            style={{
              position: "absolute",
              top: ROW_TOP + i * ROW_H,
              left: 80,
              width: 920,
              height: ROW_H - 14,
              display: "flex",
              alignItems: "center",
              fontFamily: FONT,
              color: TEXT,
              opacity: appear,
              translate: `${(1 - appear) * 700}px 0px`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
              borderLeft: `10px solid ${TEAM_COLORS[d.team]}`,
            }}
          >
            <div
              style={{
                width: 110,
                textAlign: "center",
                fontSize: 52,
                fontWeight: 900,
                fontStyle: "italic",
              }}
            >
              {d.pos}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 42,
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
                width: 130,
                paddingRight: 28,
                textAlign: "right",
                fontSize: 50,
                fontWeight: 900,
                fontStyle: "italic",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.points}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
