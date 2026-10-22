import React, { useMemo } from "react";
import {
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import { Glow } from "./Circuit";

// Болид из сглаженных профилей. Нос смотрит в сторону -Z, длина ~5,6 м.
// Профили задаются в координатах (u, v): u — вдоль машины (нос = +u), v — высота.

const geometryCache = new Map<string, BufferGeometry>();
const cached = (key: string, build: () => BufferGeometry) => {
  let g = geometryCache.get(key);
  if (!g) {
    g = build();
    geometryCache.set(key, g);
  }
  return g;
};

// Боковой профиль, вытянутый поперёк машины и отцентрированный по X
const sideExtrude = (
  points: [number, number][],
  width: number,
  bevel: number,
) => {
  const shape = new Shape(points.map(([u, v]) => new Vector2(u, v)));
  const g = new ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  // u → -z, глубина → x
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
};

const bodyGeometry = () =>
  cached("body", () =>
    sideExtrude(
      [
        [-2.15, 0.2],
        [-2.15, 0.52],
        [-1.4, 0.6],
        [-0.55, 0.9],
        [0.0, 1.0],
        [0.22, 0.86],
        [0.42, 0.66],
        [1.1, 0.64],
        [1.45, 0.52],
        [1.45, 0.2],
      ],
      0.66,
      0.07,
    ),
  );

const noseGeometry = () =>
  cached("nose", () =>
    sideExtrude(
      [
        [1.2, 0.22],
        [1.2, 0.6],
        [1.9, 0.48],
        [2.7, 0.3],
        [2.85, 0.25],
        [2.85, 0.18],
      ],
      0.34,
      0.06,
    ),
  );

const sidepodGeometry = () =>
  cached("sidepod", () =>
    sideExtrude(
      [
        [-1.5, 0.2],
        [-1.5, 0.32],
        [-0.5, 0.5],
        [0.3, 0.62],
        [0.6, 0.6],
        [0.6, 0.28],
        [0.25, 0.2],
      ],
      0.42,
      0.07,
    ),
  );

const finGeometry = () =>
  cached("fin", () =>
    sideExtrude(
      [
        [-2.05, 0.58],
        [-0.55, 0.92],
        [-2.05, 1.0],
      ],
      0.03,
      0.008,
    ),
  );

// Днище «бутылкой»: шире в середине, уже у носа и сзади
const floorGeometry = () =>
  cached("floor", () => {
    const outline: [number, number][] = [
      [-0.45, -2.1],
      [-0.62, -1.2],
      [-0.8, 0.0],
      [-0.78, 0.9],
      [-0.5, 1.6],
      [0.5, 1.6],
      [0.78, 0.9],
      [0.8, 0.0],
      [0.62, -1.2],
      [0.45, -2.1],
    ];
    // точки заданы как (x, z) с носом в -z; после поворота вокруг X вторая координата остаётся z
    const shape = new Shape(outline.map(([x, z]) => new Vector2(x, z)));
    const g = new ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.16, 0);
    return g;
  });

const tyreGeometry = (radius: number, width: number) =>
  cached(`tyre-${radius}-${width}`, () => {
    const inner = radius * 0.64;
    const h = width / 2;
    const r = 0.045;
    const g = new LatheGeometry(
      [
        new Vector2(inner, -h),
        new Vector2(radius - r, -h),
        new Vector2(radius - r * 0.3, -h + r * 0.3),
        new Vector2(radius, -h + r),
        new Vector2(radius, h - r),
        new Vector2(radius - r * 0.3, h - r * 0.3),
        new Vector2(radius - r, h),
        new Vector2(inner, h),
      ],
      40,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  });

const haloGeometry = () =>
  cached("halo", () => {
    const g = new TorusGeometry(0.3, 0.032, 10, 28, Math.PI);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI);
    return g;
  });

const CARBON = new MeshStandardMaterial({
  color: "#121216",
  roughness: 0.55,
  metalness: 0.3,
});
const TYRE = new MeshStandardMaterial({ color: "#0d0d0f", roughness: 0.9 });
const RIM = new MeshStandardMaterial({
  color: "#3a3c44",
  roughness: 0.3,
  metalness: 0.9,
});
const COMPOUND = new MeshStandardMaterial({ color: "#f5d000", roughness: 0.5 });
const VISOR = new MeshStandardMaterial({
  color: "#0a0a0a",
  roughness: 0.1,
  metalness: 0.6,
});
const LIGHT = new MeshStandardMaterial({
  color: "#ff2010",
  emissive: "#ff2010",
  emissiveIntensity: 6,
});

const paintCache = new Map<string, MeshPhysicalMaterial>();
const paint = (color: string) => {
  let m = paintCache.get(color);
  if (!m) {
    m = new MeshPhysicalMaterial({
      color,
      metalness: 0.3,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    paintCache.set(color, m);
  }
  return m;
};
const accentPaint = (color: string) => {
  const c = new Color(color);
  // акцент — тот же цвет, заметно светлее или темнее
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return paint(
    `#${c.setHSL(hsl.h, hsl.s, hsl.l > 0.5 ? hsl.l - 0.28 : hsl.l + 0.22).getHexString()}`,
  );
};

const Part: React.FC<
  React.ComponentProps<"mesh"> & { geometry?: BufferGeometry }
> = (props) => <mesh castShadow receiveShadow {...props} />;

const Wheel: React.FC<{
  x: number;
  z: number;
  radius: number;
  width: number;
  spin: number;
  steer?: number;
}> = ({ x, z, radius, width, spin, steer = 0 }) => {
  const side = Math.sign(x);
  return (
    <group position={[x, radius, z]} rotation={[0, steer, 0]}>
      <group rotation={[spin, 0, 0]}>
        <Part geometry={tyreGeometry(radius, width)} material={TYRE} />
        <Part material={RIM} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry
            args={[radius * 0.62, radius * 0.62, width * 0.86, 24]}
          />
        </Part>
        {/* спица, чтобы было видно вращение */}
        <Part material={COMPOUND} position={[side * (width / 2 + 0.002), 0, 0]}>
          <boxGeometry args={[0.01, radius * 1.1, 0.05]} />
        </Part>
        <Part
          material={COMPOUND}
          position={[side * (width / 2 + 0.003), 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[radius * 0.8, 0.012, 6, 40]} />
        </Part>
      </group>
    </group>
  );
};

export const Car3D: React.FC<{
  color: string;
  position?: [number, number, number];
  rotation?: number;
  // пройденный путь в метрах — по нему крутятся колёса
  distance?: number;
  // наклон корпуса: pitch > 0 — нос вверх (разгон), roll — крен в повороте
  pitch?: number;
  roll?: number;
  steer?: number;
}> = ({
  color,
  position = [0, 0, 0],
  rotation = 0,
  distance = 0,
  pitch = 0,
  roll = 0,
  steer = 0,
}) => {
  const body = paint(color);
  const accent = useMemo(() => accentPaint(color), [color]);
  const front = -distance / 0.36;
  const rear = -distance / 0.37;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[0, 0.4, 0]} rotation={[pitch, 0, roll]}>
        <group position={[0, -0.4, 0]}>
          <Part geometry={floorGeometry()} material={CARBON} />
          <Part geometry={bodyGeometry()} material={body} />
          <Part geometry={noseGeometry()} material={body} />
          {[-0.5, 0.5].map((x) => (
            <Part
              key={x}
              geometry={sidepodGeometry()}
              material={body}
              position={[x, 0, 0]}
            />
          ))}
          <Part geometry={finGeometry()} material={accent} />
          {/* воздухозаборник над головой пилота */}
          <Part material={CARBON} position={[0, 0.98, -0.12]}>
            <boxGeometry args={[0.26, 0.16, 0.22]} />
          </Part>
          {/* кокпит, шлем, halo */}
          <Part material={CARBON} position={[0, 0.64, -0.6]}>
            <boxGeometry args={[0.46, 0.06, 0.62]} />
          </Part>
          <Part material={accent} position={[0, 0.8, -0.42]}>
            <sphereGeometry args={[0.15, 20, 14]} />
          </Part>
          <Part
            material={VISOR}
            position={[0, 0.82, -0.53]}
            scale={[1, 0.45, 0.6]}
          >
            <sphereGeometry args={[0.12, 16, 10]} />
          </Part>
          <Part
            geometry={haloGeometry()}
            material={CARBON}
            position={[0, 0.93, -0.42]}
          />
          <Part
            material={CARBON}
            position={[0, 0.8, -0.74]}
            rotation={[-0.35, 0, 0]}
          >
            <boxGeometry args={[0.05, 0.3, 0.05]} />
          </Part>
          {/* зеркала */}
          {[-0.42, 0.42].map((x) => (
            <Part key={x} material={body} position={[x, 0.76, -0.9]}>
              <boxGeometry args={[0.14, 0.06, 0.04]} />
            </Part>
          ))}
          {/* переднее антикрыло: основная плоскость, закрылки, торцевые пластины */}
          <Part material={CARBON} position={[0, 0.1, -2.72]}>
            <boxGeometry args={[1.9, 0.03, 0.34]} />
          </Part>
          <Part
            material={accent}
            position={[0, 0.16, -2.62]}
            rotation={[0.35, 0, 0]}
          >
            <boxGeometry args={[1.76, 0.025, 0.16]} />
          </Part>
          {[-0.95, 0.95].map((x) => (
            <Part key={x} material={body} position={[x, 0.17, -2.7]}>
              <boxGeometry args={[0.03, 0.2, 0.46]} />
            </Part>
          ))}
          {/* заднее антикрыло, балочное крыло, пилон */}
          <Part
            material={CARBON}
            position={[0, 0.92, 2.06]}
            rotation={[-0.15, 0, 0]}
          >
            <boxGeometry args={[1.24, 0.035, 0.34]} />
          </Part>
          <Part
            material={body}
            position={[0, 1.07, 2.2]}
            rotation={[-0.55, 0, 0]}
          >
            <boxGeometry args={[1.24, 0.03, 0.2]} />
          </Part>
          {[-0.63, 0.63].map((x) => (
            <Part key={x} material={accent} position={[x, 0.86, 2.12]}>
              <boxGeometry args={[0.03, 0.56, 0.62]} />
            </Part>
          ))}
          <Part material={CARBON} position={[0, 0.46, 2.14]}>
            <boxGeometry args={[1.0, 0.03, 0.2]} />
          </Part>
          <Part material={CARBON} position={[0, 0.72, 2.04]}>
            <boxGeometry args={[0.07, 0.42, 0.12]} />
          </Part>
          {/* диффузор и стоп-сигнал */}
          <Part
            material={CARBON}
            position={[0, 0.22, 1.72]}
            rotation={[-0.3, 0, 0]}
          >
            <boxGeometry args={[1.0, 0.03, 0.4]} />
          </Part>
          <mesh material={LIGHT} position={[0, 0.34, 2.17]}>
            <boxGeometry args={[0.14, 0.06, 0.02]} />
          </mesh>
          <Glow
            position={[0, 0.34, 2.22]}
            size={0.9}
            color="#ff3020"
            opacity={0.8}
          />
          {/* рычаги подвески */}
          {[-1.62, 1.58].map((z) =>
            [-1, 1].map((side) =>
              [0.3, 0.44].map((y) => (
                <Part
                  key={`${z}-${side}-${y}`}
                  material={CARBON}
                  position={[side * 0.55, y, z]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.016, 0.016, 0.56, 6]} />
                </Part>
              )),
            ),
          )}
        </group>
      </group>
      <Wheel
        x={-0.82}
        z={-1.62}
        radius={0.36}
        width={0.36}
        spin={front}
        steer={steer}
      />
      <Wheel
        x={0.82}
        z={-1.62}
        radius={0.36}
        width={0.36}
        spin={front}
        steer={steer}
      />
      <Wheel x={-0.82} z={1.58} radius={0.37} width={0.44} spin={rear} />
      <Wheel x={0.82} z={1.58} radius={0.37} width={0.44} spin={rear} />
    </group>
  );
};
