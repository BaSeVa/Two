import React from "react";
import { AbsoluteFill } from "remotion";
import { Car } from "./Car";
import { TEAM_COLORS } from "./data";
import { LightPod } from "./scenes/Intro";
import {
  Checkered,
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
} from "./theme";

// Болиды на обложке: [команда, сдвиг по x, y]
const GRID = [
  ["Mercedes", 120, 0],
  ["Ferrari", 430, 40],
  ["McLaren", 30, 150],
  ["Red Bull", 340, 190],
] as const;

// Обложка для TikTok без результатов: всё важное выше нижней четверти
// и левее кнопок справа
export const Cover: React.FC = () => {
  return (
    <AbsoluteFill name="Cover" style={{ fontFamily: FONT, color: TEXT }}>
      <RaceBackground speed={0} />

      <Checkered
        width={1400}
        height={110}
        cell={28}
        style={{ position: "absolute", left: -160, top: 110, rotate: "-6deg" }}
      />

      <AbsoluteFill name="Lights" style={{ top: 340, alignItems: "center" }}>
        <div
          style={{
            width: 860,
            height: 18,
            backgroundColor: "#222",
            borderRadius: 9,
            marginBottom: -6,
          }}
        />
        <div style={{ display: "flex", gap: 26 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <LightPod key={i} on />
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill name="Title" style={{ top: 680, alignItems: "center" }}>
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

      <AbsoluteFill name="Cars" style={{ top: 1090, left: 70 }}>
        {GRID.map(([team, x, y]) => (
          <div
            key={team}
            style={{ position: "absolute", left: x, top: y, display: "flex" }}
          >
            <div
              style={{
                width: 220,
                height: 4,
                alignSelf: "center",
                background: `linear-gradient(90deg, transparent, ${TEAM_COLORS[team]})`,
                opacity: 0.6,
              }}
            />
            <Car color={TEAM_COLORS[team]} width={250} />
          </div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill name="Question" style={{ top: 1420, alignItems: "center" }}>
        <RedTag style={{ fontSize: 68 }}>КТО ВОЗЬМЁТ ТИТУЛ?</RedTag>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
