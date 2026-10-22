import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Car } from "../Car";
import { LEADER, STANDINGS, STANDINGS_AFTER, TEAM_COLORS } from "../data";
import {
  ASPHALT,
  Checkered,
  FONT,
  MUTED,
  RaceBackground,
  RedTag,
  TEXT,
  clamp,
} from "../theme";

export const RACE_DURATION = 360;

const TOP10 = STANDINGS.slice(0, 10);
const MAX = STANDINGS[0].points;

const ROW_TOP = 330;
const ROW_H = 126;
const LANE_LEFT = 170;
const FINISH_X = 856;
const LANE_END = 880;
const CAR_W = 118;
const START = 24;

// Каждая машина тормозит у своей отметки очков: чем больше очков, тем дольше едет
const travelFrames = (points: number) => 50 + 170 * Math.sqrt(points / MAX);
const progressAt = (frame: number, points: number) =>
  interpolate(frame, [START, START + travelFrames(points)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.35, 0, 0.25, 1),
  });
const carX = (frame: number, points: number) =>
  LANE_LEFT +
  progressAt(frame, points) * (points / MAX) * (FINISH_X - CAR_W - LANE_LEFT);

export const LEADER_FINISH = START + travelFrames(MAX);

const Row: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const d = TOP10[index];
  const color = TEAM_COLORS[d.team];
  const x = carX(frame, d.points);
  const speed = x - carX(frame - 1, d.points);
  const shown = Math.round(d.points * progressAt(frame, d.points));
  const isLeader = index === 0;
  const finished = frame >= LEADER_FINISH;
  const appear = interpolate(frame, [index * 2, index * 2 + 12], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const gapOpacity = interpolate(
    frame,
    [LEADER_FINISH + 10 + index * 3, LEADER_FINISH + 20 + index * 3],
    [0, 1],
    clamp,
  );

  return (
    <div
      style={{
        position: "absolute",
        top: ROW_TOP + index * ROW_H,
        left: 0,
        width: 1080,
        height: ROW_H,
        opacity: appear,
        translate: `${(1 - appear) * 200}px 0px`,
        fontFamily: FONT,
        color: TEXT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 14,
          width: 100,
          textAlign: "center",
          fontSize: 76,
          fontWeight: 900,
          fontStyle: "italic",
          color: isLeader ? "#FFD54A" : TEXT,
        }}
      >
        {d.pos}
      </div>

      <div
        style={{
          position: "absolute",
          left: LANE_LEFT,
          top: 4,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 10,
            height: 38,
            backgroundColor: color,
            alignSelf: "center",
            transform: "skewX(-14deg)",
          }}
        />
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
          position: "absolute",
          right: 80,
          top: 56,
          fontSize: 52,
          fontWeight: 900,
          fontStyle: "italic",
          fontVariantNumeric: "tabular-nums",
          color: isLeader && finished ? "#FFD54A" : TEXT,
        }}
      >
        {shown}
      </div>

      {/* полоса трассы */}
      <div
        style={{
          position: "absolute",
          left: LANE_LEFT,
          top: 58,
          width: LANE_END - LANE_LEFT,
          height: 56,
          backgroundColor: ASPHALT,
          borderTop: "2px solid #2c2d36",
          borderBottom: "2px solid #2c2d36",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 26px, transparent 26px 52px)",
          backgroundSize: "100% 2px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 27px",
          boxShadow: isLeader && finished ? `0 0 26px ${color}` : undefined,
        }}
      />

      {/* шлейф скорости */}
      <div
        style={{
          position: "absolute",
          left: x - Math.min(speed * 14, 260) + 10,
          top: 74,
          width: Math.min(speed * 14, 260),
          height: 24,
          background: `linear-gradient(90deg, transparent, ${color}aa)`,
          borderRadius: 12,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: 58 + 6 + (speed > 0.5 ? Math.sin(frame * 2.3 + index) * 1.5 : 0),
        }}
      >
        <Car color={color} width={CAR_W} />
      </div>

      <div
        style={{
          position: "absolute",
          right: 80,
          top: 8,
          fontSize: 32,
          fontWeight: 800,
          fontStyle: "italic",
          color: isLeader ? "#FFD54A" : MUTED,
          opacity: gapOpacity,
        }}
      >
        {isLeader ? "" : `−${MAX - d.points}`}
      </div>
    </div>
  );
};

export const Race: React.FC = () => {
  const frame = useCurrentFrame();
  const flag = interpolate(
    frame,
    [LEADER_FINISH - 2, LEADER_FINISH + 4, LEADER_FINISH + 30],
    [0, 1, 0],
    clamp,
  );

  return (
    <AbsoluteFill name="Race">
      <RaceBackground
        speed={interpolate(
          frame,
          [0, LEADER_FINISH, LEADER_FINISH + 30],
          [2.5, 1.5, 0.3],
          clamp,
        )}
      />

      <AbsoluteFill
        name="Header"
        style={{ top: 100, left: 80, fontFamily: FONT, color: TEXT }}
      >
        <RedTag style={{ fontSize: 54, alignSelf: "flex-start" }}>
          ЛИЧНЫЙ ЗАЧЁТ 2026
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
          {STANDINGS_AFTER} · ТОП-10
        </div>
      </AbsoluteFill>

      {TOP10.map((d, i) => (
        <Row key={d.code} index={i} />
      ))}

      {/* линия финиша */}
      <Checkered
        width={24}
        height={TOP10.length * ROW_H - 40}
        cell={12}
        style={{
          position: "absolute",
          left: FINISH_X,
          top: ROW_TOP + 52,
          opacity: 0.9,
        }}
      />

      <AbsoluteFill
        name="LeaderBanner"
        style={{
          top: ROW_TOP + TOP10.length * ROW_H + 40,
          alignItems: "center",
          opacity: interpolate(
            frame,
            [LEADER_FINISH + 6, LEADER_FINISH + 18],
            [0, 1],
            clamp,
          ),
          scale: interpolate(
            frame,
            [LEADER_FINISH + 6, LEADER_FINISH + 18],
            [0.8, 1],
            {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 900,
            fontStyle: "italic",
            color: "#FFD54A",
          }}
        >
          {LEADER.lastName.toUpperCase()} ЛИДИРУЕТ
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flag * 0.25 }} />
    </AbsoluteFill>
  );
};
