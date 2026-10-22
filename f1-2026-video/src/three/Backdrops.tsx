import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { DoubleSide } from "three";
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

// Подиум: болиды топ-3 на ступенях, конфетти и медленный облёт камеры
const PODIUM_STEPS = [
  { place: 1, x: 0, height: 2.2 },
  { place: 2, x: -3.6, height: 1.5 },
  { place: 3, x: 3.6, height: 1.0 },
];
const CONFETTI_COLORS = ["#FFD54A", "#f2f2f2", "#E10600", "#00D7B6"];
// Детерминированный «случайный» разброс, чтобы кадры рендерились одинаково
const rand = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const CONFETTI = Array.from({ length: 140 }, (_, i) => ({
  x: (rand(i, 1) - 0.5) * 16,
  z: (rand(i, 2) - 0.5) * 10,
  phase: rand(i, 3) * 14,
  fall: 0.03 + rand(i, 4) * 0.04,
  spin: 0.05 + rand(i, 5) * 0.15,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

export const Podium3D: React.FC = () => {
  const frame = useCurrentFrame();
  const orbit = -0.25 + frame * 0.0025;
  return (
    <Canvas>
      <CameraRig
        // камера смотрит ниже подиума, чтобы он встал в верхнюю, свободную от графики часть кадра
        position={[Math.sin(orbit) * 19, 5, Math.cos(orbit) * 19]}
        lookAt={[0, -3.5, 0]}
        fov={60}
      />
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <hemisphereLight args={["#c9d6ff", "#120c0c", 0.5]} />
      <directionalLight position={[6, 12, 8]} intensity={1.5} />
      <directionalLight position={[0, 6, 16]} intensity={1.1} />
      <spotLight
        position={[0, 14, 4]}
        angle={0.5}
        penumbra={0.6}
        intensity={120}
        color="#fff2cc"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#121218" roughness={0.6} metalness={0.3} />
      </mesh>

      {PODIUM_STEPS.map(({ place, x, height }) => {
        const color = TEAM_COLORS[STANDINGS[place - 1].team];
        return (
          <group key={place} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[3.4, height, 5.8]} />
              <meshStandardMaterial color="#2b2d3a" roughness={0.5} />
            </mesh>
            {/* цветная кромка ступени */}
            <mesh position={[0, height + 0.01, 2.85]}>
              <boxGeometry args={[3.4, 0.04, 0.12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.8}
              />
            </mesh>
            <group
              position={[0, height, 0]}
              rotation={[0, Math.PI + (x === 0 ? 0 : x > 0 ? -0.25 : 0.25), 0]}
            >
              <Car3D color={color} />
            </group>
          </group>
        );
      })}

      {CONFETTI.map((c, i) => {
        const y = 12 - ((frame * c.fall + c.phase) % 12);
        return (
          <mesh
            key={i}
            position={[c.x, y, c.z]}
            rotation={[frame * c.spin, frame * c.spin * 0.7, i]}
          >
            <planeGeometry args={[0.14, 0.24]} />
            <meshStandardMaterial
              color={c.color}
              side={DoubleSide}
              emissive={c.color}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
    </Canvas>
  );
};

// Вид с дрона: трасса по диагонали кадра, пелотон из шести болидов
export const Aerial3D: React.FC = () => {
  const frame = useCurrentFrame();
  const speed = 1.4;
  const travelled = frame * speed;
  return (
    <Canvas>
      <CameraRig
        position={[2 + frame * 0.01, 46, 14]}
        lookAt={[0, 0, -6]}
        fov={50}
      />
      <group rotation={[0, 0.45, 0]}>
        <Track scroll={travelled} from={-140} to={140} />
        {GRID_COLORS.map((color, i) => {
          const lane = [-3, 0, 3][i % 3];
          const z = 8 - i * 7 + Math.sin(frame / 60 + i * 1.3) * 4;
          return (
            <Car3D
              key={i}
              color={color}
              position={[lane + Math.sin(frame / 45 + i) * 0.5, 0, z]}
              distance={travelled}
            />
          );
        })}
      </group>
    </Canvas>
  );
};

// Пит-лейн: болиды команд из середины и конца зачёта стоят у боксов, камера едет вдоль
const MIDFIELD_COLORS = [
  ...new Set(STANDINGS.slice(10).map((d) => TEAM_COLORS[d.team])),
];

export const PitLane3D: React.FC = () => {
  const frame = useCurrentFrame();
  const dolly = frame * 0.14;
  const BOX = 9;
  return (
    <Canvas>
      <CameraRig
        position={[3.5, 3.2, 14 - dolly]}
        lookAt={[-4.5, 0.6, -6 - dolly]}
        fov={55}
      />
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <hemisphereLight args={["#c9d6ff", "#120c0c", 0.5]} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]}>
        <planeGeometry args={[60, 160]} />
        <meshStandardMaterial color="#26272d" roughness={0.9} />
      </mesh>
      {/* стена пит-лейна с подсветкой */}
      <mesh position={[6, 0.6, -40]}>
        <boxGeometry args={[0.4, 1.2, 160]} />
        <meshStandardMaterial color="#1c1d24" />
      </mesh>
      <mesh position={[5.78, 1.0, -40]}>
        <boxGeometry args={[0.02, 0.08, 160]} />
        <meshStandardMaterial
          color="#E10600"
          emissive="#E10600"
          emissiveIntensity={1.5}
        />
      </mesh>
      {/* белая линия пит-лейна */}
      <mesh position={[-1.5, 0.01, -40]}>
        <boxGeometry args={[0.15, 0.02, 160]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>

      {MIDFIELD_COLORS.map((color, i) => {
        const z = 6 - i * BOX;
        return (
          <group key={color}>
            {/* бокс: стены и светящийся проём */}
            <mesh position={[-11, 2.5, z]}>
              <boxGeometry args={[4, 5, BOX - 0.4]} />
              <meshStandardMaterial color="#17181f" />
            </mesh>
            <mesh position={[-8.98, 2.2, z]}>
              <boxGeometry args={[0.02, 3.6, BOX - 2]} />
              <meshStandardMaterial
                color="#3a3426"
                emissive="#ffe2a8"
                emissiveIntensity={0.18}
              />
            </mesh>
            <mesh position={[-8.97, 4.4, z]}>
              <boxGeometry args={[0.03, 0.35, BOX - 2]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.2}
              />
            </mesh>
            <group position={[-4.8, 0, z]} rotation={[0, -0.55, 0]}>
              <Car3D color={color} />
            </group>
          </group>
        );
      })}
    </Canvas>
  );
};

// Обгон: болид лидера формы проходит соперников, камера низко сбоку
export const Overtake3D: React.FC<{ colors: string[] }> = ({ colors }) => {
  const frame = useCurrentFrame();
  const speed = 1.7;
  const travelled = frame * speed;
  return (
    <Canvas>
      <CameraRig position={[6.5, 2.2, 6]} lookAt={[-0.5, 0.6, -10]} fov={52} />
      <Track scroll={travelled} />
      {colors.map((color, i) => {
        // первый цвет — лидер формы: стартует сзади и уходит вперёд
        const z =
          i === 0
            ? 10 - frame * 0.22
            : -4 - i * 6 + Math.sin(frame / 60 + i) * 1.5;
        const lane = i === 0 ? -2.4 : [0, 1.6, 2.6][(i - 1) % 3];
        return (
          <Car3D
            key={i}
            color={color}
            position={[lane, 0, z]}
            distance={travelled}
          />
        );
      })}
    </Canvas>
  );
};

// Обложка: болиды лидирующих команд летят на камеру, низкий ракурс снизу вверх
const HERO = [
  { team: "Mercedes", x: 0.2, z: -1 },
  { team: "Ferrari", x: -2.8, z: -7 },
  { team: "McLaren", x: 2.8, z: -12 },
  { team: "Red Bull", x: -0.6, z: -18 },
] as const;

export const CoverHero3D: React.FC = () => (
  <Canvas>
    <CameraRig position={[2.2, 1.0, 11]} lookAt={[0, 2.3, -8]} fov={56} />
    <Track scroll={0} from={-200} to={40} />
    <spotLight
      position={[0, 10, 12]}
      angle={0.6}
      penumbra={0.5}
      intensity={160}
      color="#fff2cc"
    />
    {HERO.map(({ team, x, z }) => (
      <group key={team} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
        <Car3D color={TEAM_COLORS[team]} />
      </group>
    ))}
  </Canvas>
);
