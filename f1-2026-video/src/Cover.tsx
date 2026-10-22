import React from "react";
import { AbsoluteFill } from "remotion";
import { Car } from "./Car";
import {
  GAP_P1_P2,
  RACES_LEFT,
  STANDINGS,
  STANDINGS_AFTER,
  TEAM_COLORS,
} from "./data";
import {
  Checkered,
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
} from "./theme";

const MEDAL = ["#FFD54A", "#D7DCE2", "#E39A5B"];

// Обложка для TikTok: всё важное выше нижней четверти и левее кнопок справа
export const Cover: React.FC = () => {
  return (
    <AbsoluteFill name="Cover" style={{ fontFamily: FONT, color: TEXT }}>
      <RaceBackground speed={0} />

      <Checkered
        width={1400}
        height={110}
        cell={28}
        style={{ position: "absolute", left: -160, top: 120, rotate: "-6deg" }}
      />

      <AbsoluteFill name="Title" style={{ top: 360, alignItems: "center" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            letterSpacing: 4,
          }}
        >
          FORMULA 1 · СЕЗОН 2026
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 150,
            lineHeight: 1,
            fontWeight: 900,
            fontStyle: "italic",
          }}
        >
          ГОНКА ЗА
        </div>
        <div
          style={{
            fontSize: 112,
            lineHeight: 1.1,
            fontWeight: 900,
            fontStyle: "italic",
            color: RED,
          }}
        >
          ЧЕМПИОНСТВОМ
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="Top3"
        style={{ top: 780, left: 70, width: 940, gap: 22 }}
      >
        {STANDINGS.slice(0, 3).map((d, i) => (
          <div
            key={d.code}
            style={{
              display: "flex",
              alignItems: "center",
              height: 150,
              padding: "0 36px",
              backgroundColor: "rgba(29,30,38,0.92)",
              borderLeft: `14px solid ${TEAM_COLORS[d.team]}`,
            }}
          >
            <div
              style={{
                width: 90,
                fontSize: 96,
                fontWeight: 900,
                fontStyle: "italic",
                color: MEDAL[i],
              }}
            >
              {d.pos}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 58, fontWeight: 900, fontStyle: "italic" }}
              >
                {d.lastName.toUpperCase()}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>
                {d.team.toUpperCase()}
              </div>
            </div>
            <Car color={TEAM_COLORS[d.team]} width={124} />
            <div
              style={{
                width: 190,
                textAlign: "right",
                fontSize: 80,
                fontWeight: 900,
                fontStyle: "italic",
                color: i === 0 ? MEDAL[0] : TEXT,
              }}
            >
              {d.points}
            </div>
          </div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill
        name="Tags"
        style={{ top: 1330, alignItems: "center", gap: 26 }}
      >
        <RedTag style={{ fontSize: 76 }}>ОТРЫВ +{GAP_P1_P2}</RedTag>
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          {STANDINGS_AFTER}
          <br />
          ОСТАЛОСЬ {RACES_LEFT} ГОНОК
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
