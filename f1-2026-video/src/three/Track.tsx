import { useThree } from "@react-three/fiber";
import React from "react";

export const TRACK_WIDTH = 14;
const KERB = 2;
const DASH = 6;

// Ночная трасса вдоль оси Z. scroll сдвигает разметку и поребрики — так машины «едут» на месте
export const Track: React.FC<{
  from?: number;
  to?: number;
  scroll?: number;
  finishAt?: number;
}> = ({ from = -160, to = 60, scroll = 0, finishAt }) => {
  const length = to - from;
  const kerbs = Math.ceil(length / KERB);
  const dashes = Math.ceil(length / DASH);
  const shift = ((scroll % (KERB * 2)) + KERB * 2) % (KERB * 2);
  const dashShift = ((scroll % DASH) + DASH) % DASH;
  const poleShift = ((scroll % 30) + 30) % 30;
  return (
    <group>
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <hemisphereLight args={["#c9d6ff", "#120c0c", 0.5]} />
      <directionalLight position={[8, 14, 6]} intensity={1.4} />
      <directionalLight
        position={[-10, 8, -20]}
        intensity={0.6}
        color="#ffd2b0"
      />

      {/* асфальт и трава */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (from + to) / 2]}>
        <planeGeometry args={[TRACK_WIDTH, length]} />
        <meshStandardMaterial color="#26272d" roughness={0.92} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, (from + to) / 2]}
      >
        <planeGeometry args={[220, length]} />
        <meshStandardMaterial color="#0c1410" roughness={1} />
      </mesh>

      {/* поребрики */}
      {[-1, 1].map((side) =>
        Array.from({ length: kerbs }, (_, i) => (
          <mesh
            key={`${side}-${i}`}
            position={[
              side * (TRACK_WIDTH / 2 + 0.5),
              0.02,
              from + i * KERB + shift,
            ]}
          >
            <boxGeometry args={[1, 0.04, KERB]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#d01818" : "#f2f2f2"} />
          </mesh>
        )),
      )}

      {/* разметка по центру */}
      {Array.from({ length: dashes }, (_, i) => (
        <mesh key={i} position={[0, 0.015, from + i * DASH + dashShift]}>
          <boxGeometry args={[0.18, 0.02, DASH / 2]} />
          <meshStandardMaterial color="#d9d9d9" />
        </mesh>
      ))}

      {/* клетчатая линия финиша */}
      {finishAt !== undefined
        ? Array.from({ length: 28 }, (_, i) =>
            [0, 1].map((row) => (
              <mesh
                key={`${i}-${row}`}
                position={[
                  -TRACK_WIDTH / 2 + 0.25 + i * 0.5,
                  0.02,
                  finishAt + row * 0.5,
                ]}
              >
                <boxGeometry args={[0.5, 0.03, 0.5]} />
                <meshStandardMaterial
                  color={(i + row) % 2 === 0 ? "#f2f2f2" : "#111"}
                />
              </mesh>
            )),
          )
        : null}

      {/* прожекторы вдоль трассы */}
      {Array.from({ length: Math.ceil(length / 30) }, (_, i) => {
        const z = from + i * 30 + poleShift;
        return [-1, 1].map((side) => (
          <group
            key={`${side}-${i}`}
            position={[side * (TRACK_WIDTH / 2 + 5), 0, z]}
          >
            <mesh position={[0, 4, 0]}>
              <boxGeometry args={[0.15, 8, 0.15]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[1.2, 0.3, 0.5]} />
              <meshStandardMaterial
                color="#fff6dd"
                emissive="#fff6dd"
                emissiveIntensity={3}
              />
            </mesh>
          </group>
        ));
      })}
    </group>
  );
};

// Камера задаётся из кадра Remotion, без собственных анимаций three.js
export const CameraRig: React.FC<{
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}> = ({ position, lookAt, fov = 50 }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(...position);
  camera.lookAt(...lookAt);
  if ("fov" in camera && camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};
