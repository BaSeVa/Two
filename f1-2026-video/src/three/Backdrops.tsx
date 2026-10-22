import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { DoubleSide, Vector3 } from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { STANDINGS, TEAM_COLORS } from "../data";
import { CameraRig } from "./camera";
import { Car3D } from "./Car3D";
import {
  CircuitScene,
  FINISH_S,
  NightLights,
  ROAD_WIDTH,
  Sparks,
  TyreSmoke,
  curvatureAt,
  distanceAfter,
  nearestS,
  poseAt,
  shake,
  speedAt,
} from "./Circuit";

const FPS = 30;

// Цвета команд первых шести пилотов зачёта — без имён и логотипов
const GRID_COLORS = STANDINGS.slice(0, 6).map((d) => TEAM_COLORS[d.team]);

const Canvas: React.FC<{
  children: React.ReactNode;
  fog?: [number, number];
}> = ({ children, fog = [70, 1100] }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        shadows="soft"
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0b0c14"]} />
        <fog attach="fog" args={["#0b0c14", ...fog]} />
        {children}
      </ThreeCanvas>
      {/* виньетка: затемняет края кадра, как у телетрансляции */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const v3 = (p: Vector3, dy = 0): [number, number, number] => [
  p.x,
  p.y + dy,
  p.z,
];

// Болид на трассе: положение, наклон при разгоне/торможении, крен и руль в повороте
const RaceCar: React.FC<{
  color: string;
  s: number;
  lane: number;
  launch?: number;
}> = ({ color, s, lane, launch }) => {
  const { pos, rotation } = poseAt(s, lane);
  const v = speedAt(s);
  const accel = ((speedAt(s + 6) - speedAt(s - 6)) / 12) * v;
  const kappa = curvatureAt(s);
  const pitch = launch ?? Math.max(-0.035, Math.min(0.025, accel * 0.0011));
  const roll = Math.max(-0.045, Math.min(0.045, -v * v * kappa * 0.0012));
  return (
    <Car3D
      color={color}
      position={v3(pos)}
      rotation={rotation}
      distance={s}
      pitch={pitch}
      roll={roll}
      steer={Math.max(-0.3, Math.min(0.3, kappa * 22))}
    />
  );
};

const carState = (s: number) => {
  const { pos, tangent } = poseAt(s);
  return { pos, tangent, speed: speedAt(s) };
};

// ---------- Старт: решётка стоит, на «огни погасли» срывается с места ----------

const gridSlot = (i: number) => ({
  s: FINISH_S - (8 + i * 8 + (i % 2) * 4),
  lane: i % 2 === 0 ? -3 : 3,
});

export const StartGrid3D: React.FC<{ lightsOut: number }> = ({ lightsOut }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - lightsOut) / FPS;
  const cam = poseAt(FINISH_S - 72 + t * 6, 4.5);
  const look = poseAt(FINISH_S - 14 + t * 14, 0);
  const sh = shake(frame, frame >= lightsOut ? 0.08 : 0.005);
  const smokeSpots = GRID_COLORS.map((_, i) => {
    const { s, lane } = gridSlot(i);
    return v3(poseAt(s - 1.6, lane).pos);
  });
  return (
    <Canvas>
      <CameraRig
        position={[cam.pos.x + sh[0], 3.4 + sh[1], cam.pos.z + sh[2]]}
        lookAt={v3(look.pos, 0.9)}
        fov={56}
      />
      <NightLights focus={v3(poseAt(FINISH_S - 30).pos)} />
      <CircuitScene />
      {GRID_COLORS.map((color, i) => {
        const { s, lane } = gridSlot(i);
        const a = 34 - i * 2.2;
        const d = 0.5 * a * t * t;
        const idle = frame < lightsOut ? Math.sin(frame * 1.7 + i) * 0.004 : 0;
        // при старте нос задирается, потом машина выравнивается
        const launch = frame >= lightsOut ? 0.03 * Math.exp(-t * 2.5) : idle;
        return (
          <RaceCar
            key={i}
            color={color}
            s={s + d}
            lane={lane}
            launch={launch}
          />
        );
      })}
      <TyreSmoke frame={frame} start={lightsOut} spots={smokeSpots} />
    </Canvas>
  );
};

// ---------- Этап за этапом: камера летит за пелотоном по кругу ----------

const PACK_START = FINISH_S + 120;
const packS = (i: number, t: number) =>
  distanceAfter(PACK_START, t) -
  8 -
  i * 10 +
  Math.sin(t * 0.45 + i * 1.7) * 6.5;
const PACK_LANES = [-3.2, -1, 1.2, 3.2];

export const RaceLoop3D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cars = GRID_COLORS.slice(0, 4);
  const center = distanceAfter(PACK_START, t) - 22;
  const cam = poseAt(center - 24, Math.sin(t * 0.4) * 2);
  const look = poseAt(center + 12);
  const sh = shake(frame, 0.05);
  return (
    <Canvas>
      <CameraRig
        position={[cam.pos.x + sh[0], 8 + sh[1], cam.pos.z + sh[2]]}
        lookAt={v3(look.pos, 1)}
        fov={55}
      />
      <NightLights focus={v3(poseAt(center).pos)} />
      <CircuitScene />
      {cars.map((color, i) => (
        <RaceCar
          key={i}
          color={color}
          s={packS(i, t)}
          lane={PACK_LANES[i] + Math.sin(t * 0.6 + i) * 0.5}
        />
      ))}
      <Sparks
        frame={frame}
        seed={1}
        carAt={(f) => carState(packS(0, f / FPS))}
      />
      <Sparks
        frame={frame}
        seed={2}
        carAt={(f) => carState(packS(2, f / FPS))}
      />
    </Canvas>
  );
};

// ---------- Финиш: болиды пролетают клетчатую линию ----------

export const Finish3D: React.FC = () => {
  const frame = useCurrentFrame();
  const v = 80;
  const passes = [
    { color: GRID_COLORS[0], at: 18, lane: -2 },
    { color: GRID_COLORS[1], at: 70, lane: 2.4 },
    { color: GRID_COLORS[2], at: 112, lane: -0.5 },
  ];
  const cam = poseAt(FINISH_S + 20, ROAD_WIDTH / 2 + 2.5);
  const look = poseAt(FINISH_S - 12, -1);
  return (
    <Canvas>
      <CameraRig
        position={v3(cam.pos, 1.5)}
        lookAt={v3(look.pos, 0.9)}
        fov={50}
      />
      <NightLights focus={v3(poseAt(FINISH_S).pos)} />
      <CircuitScene />
      {passes.map(({ color, at, lane }) => {
        const s = FINISH_S + ((frame - at) * v) / FPS;
        if (Math.abs(s - FINISH_S) > 140) return null;
        return <RaceCar key={at} color={color} s={s} lane={lane} />;
      })}
      {passes.map(({ at }, i) => (
        <Sparks
          key={at}
          frame={frame}
          seed={10 + i}
          carAt={(f) => ({
            ...carState(FINISH_S + ((f - at) * v) / FPS),
            speed: v,
          })}
        />
      ))}
    </Canvas>
  );
};

// ---------- Подиум: болиды топ-3 на ступенях, конфетти, облёт камеры ----------

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
const CONFETTI = Array.from({ length: 160 }, (_, i) => ({
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
    <Canvas fog={[22, 90]}>
      <CameraRig
        // камера смотрит ниже подиума, чтобы он встал в верхнюю, свободную от графики часть кадра
        position={[Math.sin(orbit) * 19, 5, Math.cos(orbit) * 19]}
        lookAt={[0, -3.5, 0]}
        fov={60}
      />
      <NightLights focus={[0, 0, 0]} />
      <spotLight
        position={[0, 14, 4]}
        angle={0.5}
        penumbra={0.6}
        intensity={160}
        color="#fff2cc"
        castShadow
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          color="#121218"
          roughness={0.35}
          metalness={0.5}
        />
      </mesh>
      {PODIUM_STEPS.map(({ place, x, height }) => {
        const color = TEAM_COLORS[STANDINGS[place - 1].team];
        return (
          <group key={place} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.4, height, 5.8]} />
              <meshStandardMaterial color="#2b2d3a" roughness={0.5} />
            </mesh>
            {/* светящаяся кромка ступени */}
            <mesh position={[0, height + 0.01, 2.85]}>
              <boxGeometry args={[3.4, 0.04, 0.12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
              />
            </mesh>
            <Car3D
              color={color}
              position={[0, height, 0]}
              rotation={Math.PI + (x === 0 ? 0 : x > 0 ? -0.25 : 0.25)}
            />
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
              emissiveIntensity={0.6}
            />
          </mesh>
        );
      })}
    </Canvas>
  );
};

// ---------- График сезона: вертолётный план над пелотоном в повороте ----------

const AERIAL_START = nearestS(60, -350) - 260;

export const Aerial3D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const lead = distanceAfter(AERIAL_START, t);
  const center = poseAt(lead - 20);
  const orbit = 0.6 + t * 0.06;
  return (
    <Canvas>
      <CameraRig
        position={[
          center.pos.x + Math.sin(orbit) * 34,
          44,
          center.pos.z + Math.cos(orbit) * 34,
        ]}
        lookAt={v3(center.pos)}
        fov={50}
      />
      <NightLights focus={v3(center.pos)} />
      <CircuitScene />
      {GRID_COLORS.map((color, i) => {
        const s = lead - i * 8 + Math.sin(t * 0.5 + i * 1.3) * 3;
        return <RaceCar key={i} color={color} s={s} lane={[-3, 0, 3][i % 3]} />;
      })}
    </Canvas>
  );
};

// ---------- Пелотон: пит-лейн с болидами команд из середины зачёта ----------

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
      <NightLights focus={[-4, 0, -6 - dolly]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -40]}
        receiveShadow
      >
        <planeGeometry args={[60, 160]} />
        <meshStandardMaterial color="#1e1f25" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* стена пит-лейна с подсветкой */}
      <mesh position={[6, 0.6, -40]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.2, 160]} />
        <meshStandardMaterial color="#1c1d24" />
      </mesh>
      <mesh position={[5.78, 1.0, -40]}>
        <boxGeometry args={[0.02, 0.08, 160]} />
        <meshStandardMaterial
          color="#E10600"
          emissive="#E10600"
          emissiveIntensity={4}
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
            {/* бокс: стены, тёплый проём и полоса в цвет команды */}
            <mesh position={[-11, 2.5, z]} receiveShadow>
              <boxGeometry args={[4, 5, BOX - 0.4]} />
              <meshStandardMaterial color="#17181f" />
            </mesh>
            <mesh position={[-8.98, 2.2, z]}>
              <boxGeometry args={[0.02, 3.6, BOX - 2]} />
              <meshStandardMaterial
                color="#3a3426"
                emissive="#ffe2a8"
                emissiveIntensity={0.25}
              />
            </mesh>
            <mesh position={[-8.97, 4.4, z]}>
              <boxGeometry args={[0.03, 0.35, BOX - 2]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
              />
            </mesh>
            <pointLight
              position={[-7, 3.5, z]}
              intensity={6}
              distance={10}
              color="#ffe2a8"
            />
            <Car3D color={color} position={[-4.8, 0, z]} rotation={-0.55} />
          </group>
        );
      })}
    </Canvas>
  );
};

// ---------- Кто в форме: болид лидера формы проходит соперников ----------

const BACK_STRAIGHT = nearestS(210, 0) - 160;

export const Overtake3D: React.FC<{ colors: string[] }> = ({ colors }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const base = distanceAfter(BACK_STRAIGHT, t);
  const cam = poseAt(base - 34 + t * 2, -ROAD_WIDTH / 2 - 2);
  const look = poseAt(base + 14, 1);
  const sh = shake(frame, 0.04);
  const others = [1.6, 3.4, 0.2];
  // первый цвет — лидер формы: стартует позади и набирает по 6 м/с
  const leaderS = base - 30 + t * 6;
  return (
    <Canvas>
      <CameraRig
        position={[cam.pos.x + sh[0], 3 + sh[1], cam.pos.z + sh[2]]}
        lookAt={v3(look.pos, 0.8)}
        fov={48}
      />
      <NightLights focus={v3(poseAt(base).pos)} />
      <CircuitScene />
      {colors.map((color, i) =>
        i === 0 ? (
          <RaceCar key={i} color={color} s={leaderS} lane={-3} />
        ) : (
          <RaceCar
            key={i}
            color={color}
            s={base - (i - 1) * 9}
            lane={others[(i - 1) % 3]}
          />
        ),
      )}
      <Sparks
        frame={frame}
        seed={21}
        carAt={(f) =>
          carState(distanceAfter(BACK_STRAIGHT, f / FPS) - 30 + (f / FPS) * 6)
        }
      />
    </Canvas>
  );
};

// ---------- Обложка: болиды лидирующих команд летят на камеру ----------

const HERO = [
  { team: "Mercedes", ds: -6, lane: 0.4 },
  { team: "Ferrari", ds: -14, lane: -3 },
  { team: "McLaren", ds: -21, lane: 3 },
  { team: "Red Bull", ds: -29, lane: -0.8 },
] as const;

export const CoverHero3D: React.FC = () => {
  const cam = poseAt(FINISH_S + 6, 1.8);
  const look = poseAt(FINISH_S - 20, 0);
  const lead = FINISH_S + HERO[0].ds;
  return (
    <Canvas>
      <CameraRig
        position={v3(cam.pos, 1.0)}
        lookAt={v3(look.pos, 2.4)}
        fov={56}
      />
      <NightLights focus={v3(poseAt(lead).pos)} />
      <CircuitScene />
      {HERO.map(({ team, ds, lane }) => (
        <RaceCar
          key={team}
          color={TEAM_COLORS[team]}
          s={FINISH_S + ds}
          lane={lane}
        />
      ))}
      <Sparks
        frame={40}
        seed={5}
        carAt={(f) => ({
          ...carState(lead + ((f - 40) * 82) / FPS),
          speed: 82,
        })}
      />
    </Canvas>
  );
};
