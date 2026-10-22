import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
  clamp,
} from "../theme";

export const INTRO_DURATION = 100;
const LIGHT_STEP = 12;
const FIRST_LIGHT = 14;
const LIGHTS_OUT = FIRST_LIGHT + LIGHT_STEP * 4 + 18;

const LightPod: React.FC<{ on: boolean }> = ({ on }) => (
  <div
    style={{
      width: 136,
      padding: "18px 0",
      backgroundColor: "#111",
      borderRadius: 22,
      border: "4px solid #2a2a2a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
    }}
  >
    {[0, 1].map((k) => (
      <div
        key={k}
        style={{
          width: 92,
          height: 92,
          borderRadius: "50%",
          backgroundColor: on ? "#ff1a0d" : "#2b0605",
          boxShadow: on
            ? "0 0 40px 10px rgba(255,30,10,0.75), inset 0 -8px 16px rgba(0,0,0,0.35)"
            : "inset 0 -8px 16px rgba(0,0,0,0.5)",
        }}
      />
    ))}
  </div>
);

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const out = frame >= LIGHTS_OUT;

  return (
    <AbsoluteFill name="Intro">
      <RaceBackground speed={out ? 2.5 : 0.4} />

      <AbsoluteFill name="Lights" style={{ alignItems: "center", top: 260 }}>
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
            <LightPod
              key={i}
              on={!out && frame >= FIRST_LIGHT + i * LIGHT_STEP}
            />
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="Title"
        style={{
          top: 860,
          alignItems: "center",
          fontFamily: FONT,
          color: TEXT,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            letterSpacing: 4,
            opacity: interpolate(frame, [0, 14], [0, 1], clamp),
          }}
        >
          FORMULA 1 · СЕЗОН 2026
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 132,
            lineHeight: 1,
            fontWeight: 900,
            fontStyle: "italic",
            textAlign: "center",
            translate: interpolate(frame, [0, 18], ["-900px 0px", "0px 0px"], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          ГОНКА ЗА
        </div>
        <div
          style={{
            fontSize: 132,
            lineHeight: 1.05,
            fontWeight: 900,
            fontStyle: "italic",
            textAlign: "center",
            color: RED,
            translate: interpolate(frame, [4, 22], ["900px 0px", "0px 0px"], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          КУБОК
          <br />
          ПИЛОТОВ
        </div>
      </AbsoluteFill>

      <AbsoluteFill name="Go" style={{ top: 1560, alignItems: "center" }}>
        <RedTag
          style={{
            fontSize: 96,
            opacity: interpolate(
              frame,
              [LIGHTS_OUT, LIGHTS_OUT + 3],
              [0, 1],
              clamp,
            ),
            scale: interpolate(frame, [LIGHTS_OUT, LIGHTS_OUT + 8], [1.6, 1], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          ПОЕХАЛИ!
        </RedTag>
      </AbsoluteFill>

      <AbsoluteFill
        name="Flash"
        style={{
          backgroundColor: "#fff",
          opacity: interpolate(
            frame,
            [LIGHTS_OUT, LIGHTS_OUT + 2, LIGHTS_OUT + 10],
            [0, 0.5, 0],
            clamp,
          ),
        }}
      />
    </AbsoluteFill>
  );
};
