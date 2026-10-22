import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const FONT = "F1Inter";

export const fontsLoaded = Promise.all([
  loadFont({
    family: FONT,
    url: staticFile("fonts/Inter-BlackItalic.otf"),
    weight: "900",
    style: "italic",
  }),
  loadFont({
    family: FONT,
    url: staticFile("fonts/Inter-ExtraBoldItalic.otf"),
    weight: "800",
    style: "italic",
  }),
  loadFont({
    family: FONT,
    url: staticFile("fonts/Inter-Bold.otf"),
    weight: "700",
  }),
  loadFont({
    family: FONT,
    url: staticFile("fonts/Inter-SemiBold.otf"),
    weight: "600",
  }),
]);

export const RED = "#E10600";
export const BG = "#0B0B10";
export const ASPHALT = "#1A1B22";
export const TEXT = "#FFFFFF";
export const MUTED = "#9A9CA8";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Карбоновый фон с бегущими «скоростными» полосами
export const RaceBackground: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const frame = useCurrentFrame();
  const lines = Array.from({ length: 14 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.025) 0 6px, transparent 6px 12px)",
        }}
      />
      {lines.map((i) => {
        const y = (i * 137) % HEIGHT;
        const len = 180 + ((i * 53) % 260);
        const x =
          ((((i * 311 - frame * (28 + (i % 4) * 10) * speed) % (WIDTH + 800)) +
            WIDTH +
            800) %
            (WIDTH + 800)) -
          400;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: len,
              height: 3,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.10))",
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(225,6,0,0.18), transparent 65%)",
        }}
      />
    </AbsoluteFill>
  );
};

// Шахматная полоса финиша
export const Checkered: React.FC<{
  width: number;
  height: number;
  cell?: number;
  style?: React.CSSProperties;
}> = ({ width, height, cell = 20, style }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: "#fff",
      backgroundImage: `conic-gradient(#111 25%, transparent 25% 50%, #111 50% 75%, transparent 75%)`,
      backgroundSize: `${cell * 2}px ${cell * 2}px`,
      ...style,
    }}
  />
);

// Красная наклонная плашка в стиле ТВ-графики
export const RedTag: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      display: "inline-block",
      backgroundColor: RED,
      color: TEXT,
      fontFamily: FONT,
      fontWeight: 900,
      fontStyle: "italic",
      padding: "10px 28px",
      transform: "skewX(-14deg)",
      ...style,
    }}
  >
    <div style={{ transform: "skewX(14deg)" }}>{children}</div>
  </div>
);

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const useFlicker = (start: number) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [start, start + 2, start + 4, start + 6],
    [0, 1, 0.4, 1],
    clamp,
  );
};
