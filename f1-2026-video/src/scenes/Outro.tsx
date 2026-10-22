import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  GAP_P1_P2,
  LEADER,
  NEXT_RACE,
  RACES_LEFT,
  SOURCE_NOTE,
  STANDINGS,
} from "../data";
import {
  Checkered,
  FONT,
  MUTED,
  RED,
  RaceBackground,
  RedTag,
  TEXT,
  clamp,
} from "../theme";

export const OUTRO_DURATION = 192;

const pop = (frame: number, start: number) =>
  interpolate(frame, [start, start + 14], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Outro">
      <RaceBackground speed={1.2} />

      <Checkered
        width={1400}
        height={120}
        cell={30}
        style={{
          position: "absolute",
          left: -160,
          top: 150,
          rotate: "-6deg",
          translate: interpolate(frame, [0, 20], ["-1400px 0px", "0px 0px"], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />

      <AbsoluteFill
        name="Gap"
        style={{
          top: 470,
          alignItems: "center",
          fontFamily: FONT,
          color: TEXT,
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 800,
            fontStyle: "italic",
            color: MUTED,
            opacity: pop(frame, 8),
          }}
        >
          ОТРЫВ ЛИДЕРА
        </div>
        <div
          style={{
            fontSize: 300,
            lineHeight: 1,
            fontWeight: 900,
            fontStyle: "italic",
            color: "#FFD54A",
            opacity: pop(frame, 12),
            scale: interpolate(frame, [12, 26], [1.5, 1], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          +{GAP_P1_P2}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            fontStyle: "italic",
            opacity: pop(frame, 20),
          }}
        >
          {LEADER.lastName.toUpperCase()} vs{" "}
          {STANDINGS[1].lastName.toUpperCase()}
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="RacesLeft"
        style={{ top: 1110, alignItems: "center", opacity: pop(frame, 34) }}
      >
        <RedTag style={{ fontSize: 64 }}>ОСТАЛОСЬ {RACES_LEFT} ГОНОК</RedTag>
        <div
          style={{
            marginTop: 40,
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 900,
            fontStyle: "italic",
            color: TEXT,
            opacity: pop(frame, 46),
          }}
        >
          БОРЬБА <span style={{ color: RED }}>ПРОДОЛЖАЕТСЯ</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="NextRace"
        style={{
          top: 1420,
          alignItems: "center",
          fontFamily: FONT,
          fontStyle: "italic",
          opacity: pop(frame, 70),
          translate: `0px ${(1 - pop(frame, 70)) * 40}px`,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: MUTED }}>
          СЛЕДУЮЩИЙ ЭТАП
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: TEXT }}>
          {NEXT_RACE}
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        name="Source"
        style={{
          top: 1700,
          left: 80,
          right: 80,
          width: "auto",
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 600,
          color: MUTED,
          textAlign: "center",
          opacity: pop(frame, 50),
        }}
      >
        {SOURCE_NOTE}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
