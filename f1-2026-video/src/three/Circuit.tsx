import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  Texture,
  Vector3,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  asphaltTexture,
  fenceTexture,
  glowTexture,
  kerbTexture,
  seeded,
  smokeTexture,
  wallTexture,
  windowsTexture,
} from "./textures";

// ---------- Геометрия трассы ----------

export const ROAD_WIDTH = 14;
const FPS = 30;

// Городская трасса: прямая старт-финиша вдоль -Z, первый поворот, шикана, дуга и финальный вираж
const CONTROL: [number, number][] = [
  [0, 260],
  [0, 120],
  [0, -20],
  [0, -160],
  [0, -260],
  [12, -320],
  [60, -350],
  [120, -340],
  [150, -300],
  [150, -240],
  [176, -200],
  [150, -160],
  [160, -80],
  [200, -20],
  [210, 80],
  [190, 180],
  [140, 260],
  [80, 320],
  [25, 315],
  [5, 290],
];

const curve = new CatmullRomCurve3(
  CONTROL.map(([x, z]) => new Vector3(x, 0, z)),
  true,
  "centripetal",
);
curve.arcLengthDivisions = 4000;
export const LAP = curve.getLength();

const N = 3000;
const DS = LAP / N;
const points = curve.getSpacedPoints(N);
const tangents = Array.from({ length: N + 1 }, (_, i) =>
  curve.getTangentAt(i / N),
);
const rightOf = (t: Vector3) => new Vector3(-t.z, 0, t.x).normalize();

// Профиль скорости по кривизне: тормоза перед поворотами, разгон на выходе
const VMAX = 86;
const A_LAT = 38;
const A_ACC = 14;
const A_BRAKE = 42;
const heading = tangents.map((t) => Math.atan2(t.x, t.z));
const curvature = heading.map((h, i) => {
  const next = heading[(i + 1) % N];
  let d = next - h;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) / DS;
});
const smooth = curvature.map((_, i) => {
  let sum = 0;
  for (let k = -12; k <= 12; k++) sum += curvature[(i + k + N) % N];
  return sum / 25;
});
const speed = smooth.map((k) =>
  Math.min(VMAX, Math.sqrt(A_LAT / Math.max(k, 1e-6))),
);
for (let pass = 0; pass < 2; pass++) {
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    speed[j] = Math.min(speed[j], Math.sqrt(speed[i] ** 2 + 2 * A_ACC * DS));
  }
  for (let i = N - 1; i >= 0; i--) {
    const j = (i + 1) % N;
    speed[i] = Math.min(speed[i], Math.sqrt(speed[j] ** 2 + 2 * A_BRAKE * DS));
  }
}
const timeAt = [0];
for (let i = 0; i < N; i++) {
  timeAt.push(timeAt[i] + DS / ((speed[i] + speed[(i + 1) % N]) / 2));
}
export const LAP_TIME = timeAt[N];

const wrap = (s: number) => ((s % LAP) + LAP) % LAP;

// Путь по трассе через t секунд после старта с отметки s0 (на полной скорости)
export const distanceAfter = (s0: number, t: number) => {
  const i0 = Math.floor(wrap(s0) / DS);
  const target = timeAt[i0] + t;
  const laps = Math.floor(target / LAP_TIME);
  const tt = target - laps * LAP_TIME;
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (timeAt[mid] <= tt) lo = mid;
    else hi = mid;
  }
  const f = (tt - timeAt[lo]) / (timeAt[hi] - timeAt[lo]);
  return laps * LAP + (lo + f) * DS - i0 * DS + s0;
};

export const speedAt = (s: number) => speed[Math.floor(wrap(s) / DS) % N];
export const curvatureAt = (s: number) => {
  const i = Math.floor(wrap(s) / DS) % N;
  const h0 = heading[i];
  const h1 = heading[(i + 6) % N];
  let d = h1 - h0;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return d / (6 * DS);
};

// Положение на трассе: s — путь в метрах, lane — сдвиг от оси вправо
export const poseAt = (s: number, lane = 0) => {
  const u = wrap(s) / LAP;
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u);
  const r = rightOf(t);
  const pos = p.clone().addScaledVector(r, lane);
  return {
    pos,
    tangent: t,
    right: r,
    // болид смотрит носом в -Z, поэтому поворачиваем его так, чтобы -Z совпал с направлением
    rotation: Math.atan2(-t.x, -t.z),
  };
};

// Отметка на трассе, ближайшая к точке (x, z)
export const nearestS = (x: number, z: number) => {
  let best = 0;
  let bestD = Infinity;
  points.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best * DS;
};
export const FINISH_S = nearestS(0, 0);

// Полоса вдоль трассы между сдвигами a и b (поперёк) и высотами ya, yb
const ribbon = (
  a: number,
  b: number,
  ya: number,
  yb: number,
  vScale: number,
) => {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = points[i % N];
    const r = rightOf(tangents[i % N]);
    pos.push(
      p.x + r.x * a,
      ya,
      p.z + r.z * a,
      p.x + r.x * b,
      yb,
      p.z + r.z * b,
    );
    const v = (i * DS) / vScale;
    uv.push(0, v, 1, v);
    if (i < N) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
};

// ---------- Окружение ----------

const W2 = ROAD_WIDTH / 2;

const Road: React.FC = () => {
  const road = useMemo(() => ribbon(-W2, W2, 0.01, 0.01, 12), []);
  const kerbL = useMemo(() => ribbon(-W2 - 1.4, -W2, 0.03, 0.03, 2.4), []);
  const kerbR = useMemo(() => ribbon(W2, W2 + 1.4, 0.03, 0.03, 2.4), []);
  const runoffL = useMemo(
    () => ribbon(-W2 - 7, -W2 - 1.4, 0.015, 0.015, 8),
    [],
  );
  const runoffR = useMemo(() => ribbon(W2 + 1.4, W2 + 7, 0.015, 0.015, 8), []);
  // у бетонной стены u = 0 вверху: там красная полоса текстуры
  const wallL = useMemo(() => ribbon(-W2 - 7, -W2 - 7, 1.2, 0, 8), []);
  const wallR = useMemo(() => ribbon(W2 + 7, W2 + 7, 1.2, 0, 8), []);
  const fenceL = useMemo(() => ribbon(-W2 - 7.1, -W2 - 7.1, 4.5, 1.2, 3.3), []);
  const fenceR = useMemo(() => ribbon(W2 + 7.1, W2 + 7.1, 4.5, 1.2, 3.3), []);
  const fence = fenceTexture();
  return (
    <group>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial
          map={asphaltTexture()}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {[kerbL, kerbR].map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial map={kerbTexture()} roughness={0.6} />
        </mesh>
      ))}
      {[runoffL, runoffR].map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial color="#1d1f24" roughness={0.95} />
        </mesh>
      ))}
      {[wallL, wallR].map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow castShadow>
          <meshStandardMaterial
            map={wallTexture()}
            roughness={0.8}
            side={DoubleSide}
          />
        </mesh>
      ))}
      {[fenceL, fenceR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            map={fence}
            transparent
            alphaTest={0.25}
            side={DoubleSide}
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[100, -0.02, -20]}
        receiveShadow
      >
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#06070a" roughness={1} />
      </mesh>
    </group>
  );
};

// Клетчатая линия старта-финиша и разметка стартовых позиций
const StartFinish: React.FC = () => {
  const { pos, rotation } = poseAt(FINISH_S);
  return (
    <group position={[pos.x, 0.035, pos.z]} rotation={[0, rotation, 0]}>
      {Array.from({ length: 28 }, (_, i) =>
        [0, 1].map((row) => (
          <mesh
            key={`${i}-${row}`}
            position={[-W2 + 0.25 + i * 0.5, 0, row * 0.5]}
            receiveShadow
          >
            <boxGeometry args={[0.5, 0.01, 0.5]} />
            <meshStandardMaterial
              color={(i + row) % 2 === 0 ? "#f2f2f2" : "#111"}
            />
          </mesh>
        )),
      )}
      {/* «гаражи» стартовых позиций за линией */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          position={[i % 2 === 0 ? -3 : 3, 0, 8 + i * 8 + (i % 2) * 4]}
          receiveShadow
        >
          <boxGeometry args={[2.4, 0.01, 0.15]} />
          <meshStandardMaterial color="#e6e6e6" />
        </mesh>
      ))}
    </group>
  );
};

// Прожекторы вдоль трассы: мачта, светящаяся голова и ореол
const POLE_STEP = 46;
const Floodlights: React.FC = () => {
  const poles = useMemo(() => {
    const out: { x: number; z: number; key: string }[] = [];
    for (let s = 0; s < LAP; s += POLE_STEP) {
      [-1, 1].forEach((side) => {
        const { pos } = poseAt(
          s + (side > 0 ? POLE_STEP / 2 : 0),
          side * (W2 + 10),
        );
        out.push({ x: pos.x, z: pos.z, key: `${s}-${side}` });
      });
    }
    return out;
  }, []);
  return (
    <group>
      {poles.map(({ x, z, key }) => (
        <group key={key} position={[x, 0, z]}>
          <mesh position={[0, 7, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 14, 8]} />
            <meshStandardMaterial
              color="#2a2c33"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 14.2, 0]}>
            <boxGeometry args={[2.2, 0.5, 0.6]} />
            <meshStandardMaterial
              color="#fff4d6"
              emissive="#fff4d6"
              emissiveIntensity={4}
            />
          </mesh>
          <Glow
            position={[0, 14.2, 0]}
            size={9}
            color="#ffe9c0"
            opacity={0.55}
          />
        </group>
      ))}
    </group>
  );
};

// Трибуны вдоль прямой старт-финиша: зрители и вспышки телефонов — инстансами, одним вызовом отрисовки
const Grandstands: React.FC = () => {
  const crowd = useMemo(() => {
    const rnd = seeded(42);
    const people: { p: [number, number, number]; c: string }[] = [];
    const flashes: [number, number, number][] = [];
    const palette = [
      "#3a3f4a",
      "#5a5f6a",
      "#7a2a2a",
      "#2a4a6a",
      "#6a6a3a",
      "#2a5a4a",
    ];
    for (let z = -200; z <= 200; z += 1.6) {
      if (Math.abs(z) < 12) continue;
      for (let row = 0; row < 8; row++) {
        if (rnd() < 0.25) continue;
        const p: [number, number, number] = [
          W2 + 14 + row * 1.6,
          1.4 + row * 1.0,
          z + (rnd() - 0.5) * 0.6,
        ];
        if (rnd() < 0.05) flashes.push([p[0] - 0.3, p[1] + 0.3, p[2]]);
        else people.push({ p, c: palette[Math.floor(rnd() * palette.length)] });
      }
    }
    return { people, flashes };
  }, []);
  const peopleRef = React.useRef<InstancedMesh>(null);
  const flashRef = React.useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();
    crowd.people.forEach(({ p, c }, i) => {
      dummy.position.set(...p);
      dummy.updateMatrix();
      peopleRef.current!.setMatrixAt(i, dummy.matrix);
      peopleRef.current!.setColorAt(i, color.set(c));
    });
    peopleRef.current!.instanceMatrix.needsUpdate = true;
    if (peopleRef.current!.instanceColor)
      peopleRef.current!.instanceColor.needsUpdate = true;
    crowd.flashes.forEach((p, i) => {
      dummy.position.set(...p);
      dummy.updateMatrix();
      flashRef.current!.setMatrixAt(i, dummy.matrix);
    });
    flashRef.current!.instanceMatrix.needsUpdate = true;
  }, [crowd]);
  return (
    <group>
      {Array.from({ length: 8 }, (_, row) => (
        <mesh
          key={row}
          position={[W2 + 14 + row * 1.6, 0.5 + row * 0.5, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[1.6, 1 + row * 1.0, 420]} />
          <meshStandardMaterial color="#1b1d24" roughness={0.9} />
        </mesh>
      ))}
      {/* крыша трибуны */}
      <mesh position={[W2 + 20, 12, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[16, 0.4, 420]} />
        <meshStandardMaterial color="#14161c" />
      </mesh>
      <instancedMesh
        ref={peopleRef}
        args={[undefined, undefined, crowd.people.length]}
      >
        <boxGeometry args={[0.45, 0.6, 0.45]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={flashRef}
        args={[undefined, undefined, crowd.flashes.length]}
      >
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={6}
        />
      </instancedMesh>
    </group>
  );
};

// Ночной город на горизонте и колесо обозрения
const Skyline: React.FC = () => {
  const materials = useMemo(
    () =>
      [0, 1, 2, 3].map((v) => {
        const map = windowsTexture(v).clone() as Texture;
        map.repeat.set(2, 3);
        map.needsUpdate = true;
        return new MeshStandardMaterial({
          color: "#07080c",
          emissive: "#ffffff",
          emissiveMap: map,
          emissiveIntensity: 1.6,
          roughness: 0.9,
        });
      }),
    [],
  );
  const buildings = useMemo(() => {
    const rnd = seeded(9);
    return Array.from({ length: 110 }, (_, i) => {
      const a = (i / 110) * Math.PI * 2 + rnd() * 0.04;
      const r = 480 + rnd() * 320;
      const w = 22 + rnd() * 34;
      const h = 40 + rnd() ** 1.6 * 230;
      return {
        p: [100 + Math.cos(a) * r, h / 2, -20 + Math.sin(a) * r] as [
          number,
          number,
          number,
        ],
        s: [w, h, w * (0.6 + rnd() * 0.8)] as [number, number, number],
        m: materials[i % materials.length],
        roofLight: rnd() < 0.35,
      };
    });
  }, [materials]);
  return (
    <group>
      {buildings.map(({ p, s, m, roofLight }, i) => (
        <group key={i}>
          <mesh position={p} material={m}>
            <boxGeometry args={s} />
          </mesh>
          {roofLight ? (
            <mesh position={[p[0], s[1] + 1, p[2]]}>
              <sphereGeometry args={[1.4, 8, 6]} />
              <meshStandardMaterial
                color="#ff3030"
                emissive="#ff3030"
                emissiveIntensity={5}
              />
            </mesh>
          ) : null}
        </group>
      ))}
      {/* колесо обозрения */}
      <group position={[-380, 90, -360]} rotation={[0, 0.7, 0]}>
        <mesh>
          <torusGeometry args={[80, 1.2, 8, 96]} />
          <meshStandardMaterial
            color="#9fd8ff"
            emissive="#9fd8ff"
            emissiveIntensity={2.5}
          />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 16) * Math.PI]}>
            <boxGeometry args={[160, 0.6, 0.6]} />
            <meshStandardMaterial
              color="#5e7f99"
              emissive="#5e7f99"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        <mesh position={[0, -60, 0]}>
          <boxGeometry args={[6, 60, 6]} />
          <meshStandardMaterial color="#1a1c22" />
        </mesh>
      </group>
    </group>
  );
};

export const CircuitScene: React.FC<{ stands?: boolean }> = ({
  stands = true,
}) => (
  <group>
    <Road />
    <StartFinish />
    <Floodlights />
    {stands ? <Grandstands /> : null}
    <Skyline />
  </group>
);

// ---------- Свет, отражения и постобработка ----------

// Карта окружения для бликов на лаке без внешних HDRI
const Environment: React.FC<{ intensity?: number }> = ({
  intensity = 0.22,
}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
};

// Ночной свет: «луна» с тенями следует за местом действия
export const NightLights: React.FC<{ focus: [number, number, number] }> = ({
  focus,
}) => {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <Environment />
      <ambientLight intensity={0.25} color="#9fb4ff" />
      <hemisphereLight args={["#b9c8ff", "#1a1010", 0.45]} />
      <primitive object={target} position={focus} />
      <directionalLight
        castShadow
        target={target}
        position={[focus[0] + 18, 40, focus[2] + 24]}
        intensity={2.2}
        color="#fff1dc"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      <directionalLight
        position={[focus[0] - 30, 20, focus[2] - 40]}
        intensity={0.7}
        color="#ffc9a0"
      />
    </>
  );
};

// Ореол вокруг яркого источника: заменяет bloom, который в рендере Remotion не работает
export const Glow: React.FC<{
  position: [number, number, number];
  size: number;
  color: string;
  opacity?: number;
}> = ({ position, size, color, opacity = 0.6 }) => (
  <sprite position={position} scale={[size, size, 1]}>
    <spriteMaterial
      map={glowTexture()}
      color={color}
      transparent
      opacity={opacity}
      blending={AdditiveBlending}
      depthWrite={false}
    />
  </sprite>
);

// ---------- Динамика: искры и дым ----------

const hash = (a: number, b: number) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// Искры из-под днища: вспышки рождаются в отдельные кадры и летят назад, всё считается от кадра
export const Sparks: React.FC<{
  frame: number;
  seed: number;
  // положение и направление болида на произвольном кадре
  carAt: (f: number) => { pos: Vector3; tangent: Vector3; speed: number };
}> = ({ frame, seed, carAt }) => {
  const sparks: { p: [number, number, number]; s: number; key: string }[] = [];
  const LIFE = 7;
  for (let f0 = frame - LIFE; f0 <= frame; f0++) {
    if (f0 < 0 || hash(f0, seed) > 0.35) continue;
    const { pos, tangent, speed: v } = carAt(f0);
    if (v < 55) continue;
    const age = (frame - f0) / FPS;
    for (let j = 0; j < 7; j++) {
      const lateral = (hash(f0 * 7 + j, seed + 1) - 0.5) * 6;
      const up = 1 + hash(f0 * 3 + j, seed + 2) * 2.5;
      const back = v * (0.55 + hash(f0 + j, seed + 3) * 0.25);
      const base = pos.clone().addScaledVector(tangent, -0.3);
      const x =
        base.x + tangent.x * back * age * 0.5 + -tangent.z * lateral * age;
      const z =
        base.z + tangent.z * back * age * 0.5 + tangent.x * lateral * age;
      const y = 0.08 + up * age - 4.9 * age * age;
      if (y < 0) continue;
      sparks.push({
        p: [x, y, z],
        s: 1 - (frame - f0) / LIFE,
        key: `${f0}-${j}`,
      });
    }
  }
  return (
    <group>
      {sparks.map(({ p, s, key }) => (
        <Glow
          key={key}
          position={p}
          size={0.5 * s + 0.15}
          color="#ffb347"
          opacity={0.95}
        />
      ))}
    </group>
  );
};

// Дым от шин на старте: облачка растут, поднимаются и тают
export const TyreSmoke: React.FC<{
  frame: number;
  start: number;
  spots: [number, number, number][];
}> = ({ frame, start, spots }) => {
  const tex = smokeTexture();
  const puffs: {
    p: [number, number, number];
    s: number;
    o: number;
    key: string;
  }[] = [];
  for (let f0 = start; f0 <= frame && f0 < start + 24; f0 += 2) {
    const age = (frame - f0) / FPS;
    if (age > 1.6) continue;
    spots.forEach(([x, y, z], i) => {
      const drift = hash(f0, i) - 0.5;
      puffs.push({
        p: [x + drift * 1.5, y + 0.3 + age * 1.4, z + age * 2.5],
        s: 1.2 + age * 4,
        o: 0.55 * (1 - age / 1.6),
        key: `${f0}-${i}`,
      });
    });
  }
  return (
    <group>
      {puffs.map(({ p, s, o, key }) => (
        <sprite key={key} position={p} scale={[s, s, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={o}
            depthWrite={false}
            color="#cfd3da"
          />
        </sprite>
      ))}
    </group>
  );
};

// Лёгкая тряска камеры, растёт со скоростью
export const shake = (
  frame: number,
  amount: number,
): [number, number, number] => [
  (Math.sin(frame * 1.7) + Math.sin(frame * 3.1 + 1) * 0.5) * amount,
  (Math.sin(frame * 2.3 + 2) + Math.sin(frame * 4.7) * 0.4) * amount * 0.6,
  Math.sin(frame * 1.3 + 4) * amount * 0.4,
];
