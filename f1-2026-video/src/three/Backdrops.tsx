import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { STANDINGS, TEAM_COLORS } from "../data";
import { Car3D } from "./Car3D";
import { CameraRig, Track } from "./Track";

// Цвета команд первых шести пилотов зачёта — без имён и логотипов
const GRID_COLORS = STANDINGS.slice(0, 6).map((d) => TEAM_COLORS[d.team]);

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }}>
      <color attach="background" args={["#0B0B10"]} />
      <fog attach="fog" args={["#0B0B10", 25, 130]} />
      {children}
    </ThreeCanvas>
  );
};

// Стартовая решётка: до lightsOut машины стоят, потом уходят со старта
export const StartGrid3D: React.FC<{ lightsOut: number }> = ({ lightsOut }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - lightsOut) / 30;
  return (
    <Canvas>
      <CameraRig
        position={[4.5 - t * 0.6, 2.4 + t * 0.4, 26 - t * 4]}
        lookAt={[0, 0.6, 2 - t * 10]}
        fov={58}
      />
      <Track />
      {GRID_COLORS.map((color, i) => {
        const row = Math.floor(i / 2);
        const x = i % 2 === 0 ? -2.2 : 2.2;
        const z = row * 9 + (i % 2) * 4.5;
        // разгон с разным ускорением, чтобы машины растягивались
        const a = 60 - i * 4;
        const d = 0.5 * a * t * t;
        const idle = frame < lightsOut ? Math.sin(frame * 1.7 + i) * 0.006 : 0;
        return (
          <Car3D
            key={i}
            color={color}
            position={[x, idle, z - d]}
            distance={d}
          />
        );
      })}
    </Canvas>
  );
};

// Гонка на прямой: камера летит за пелотоном, машины меняются местами
export const RaceLoop3D: React.FC = () => {
  const frame = useCurrentFrame();
  const speed = 1.6; // метров за кадр
  const travelled = frame * speed;
  const cars = GRID_COLORS.slice(0, 4);
  return (
    <Canvas>
      <CameraRig
        position={[Math.sin(frame / 90) * 1.5, 6.5, 8]}
        lookAt={[0, 0.5, -16]}
        fov={55}
      />
      <Track scroll={travelled} />
      {cars.map((color, i) => {
        const lane = [-2.6, -0.9, 0.9, 2.6][i];
        const z = -12 - i * 6 + Math.sin(frame / 70 + i * 1.9) * 5;
        return (
          <Car3D
            key={i}
            color={color}
            position={[lane + Math.sin(frame / 50 + i) * 0.4, 0, z]}
            distance={travelled}
          />
        );
      })}
    </Canvas>
  );
};

// Финишная линия сбоку: лидер и преследователи пролетают мимо камеры
export const Finish3D: React.FC = () => {
  const frame = useCurrentFrame();
  const speed = 1.6;
  const passes = [
    { color: GRID_COLORS[0], at: 18, lane: -1.5 },
    { color: GRID_COLORS[1], at: 70, lane: 1.8 },
    { color: GRID_COLORS[2], at: 112, lane: -0.4 },
  ];
  return (
    <Canvas>
      <CameraRig position={[5.5, 1.3, -14]} lookAt={[-0.5, 0.6, 12]} fov={50} />
      <Track finishAt={0} />
      {passes.map(({ color, at, lane }) => {
        // на кадре at машина пересекает линию финиша (z = 0) и летит к камере
        const z = (at - frame) * speed;
        if (z < -30 || z > 130) return null;
        return (
          <Car3D
            key={at}
            color={color}
            position={[lane, 0, z]}
            distance={(frame - at) * speed}
          />
        );
      })}
    </Canvas>
  );
};
