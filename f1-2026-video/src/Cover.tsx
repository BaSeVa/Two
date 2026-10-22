import React from "react";
import { AbsoluteFill } from "remotion";
import { LightPod } from "./scenes/Intro";
import { CoverHero3D } from "./three/Backdrops";
import {
  Checkered,
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
} from "./theme";

// Обложка для TikTok без результатов: всё важное выше нижней четверти
// и левее кнопок справа
export const Cover: React.FC = () => {
  return (
    <AbsoluteFill name="Cover" style={{ fontFamily: FONT, color: TEXT }}>
      <RaceBackground speed={0} />
      <AbsoluteFill name="Hero3D">
        <CoverHero3D />
        {/* затемнение сверху под заголовок, снизу под интерфейс TikTok */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(11,11,16,0.85) 0%, rgba(11,11,16,0.55) 45%, rgba(11,11,16,0) 62%, rgba(11,11,16,0.1) 80%, rgba(11,11,16,0.8) 100%)",
          }}
        />
      </AbsoluteFill>

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

      <AbsoluteFill name="Question" style={{ top: 1420, alignItems: "center" }}>
        <RedTag style={{ fontSize: 68 }}>КТО ВОЗЬМЁТ ТИТУЛ?</RedTag>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
