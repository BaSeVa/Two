import React from "react";

const CARBON = "#141418";
const TYRE = "#0b0b0b";

const Wheel: React.FC<{
  position: [number, number, number];
  radius: number;
  width: number;
  spin: number;
}> = ({ position, radius, width, spin }) => (
  <group position={position} rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, width, 20]} />
      <meshStandardMaterial color={TYRE} roughness={0.85} />
    </mesh>
    {/* полоска на боковине, чтобы было видно вращение */}
    <mesh
      position={[width / 2 + 0.005, radius * 0.6, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <boxGeometry args={[0.01, 0.06, radius * 0.5]} />
      <meshStandardMaterial color="#f5d000" />
    </mesh>
  </group>
);

// Низкополигональный болид из примитивов; нос смотрит в сторону -Z, длина ~5 м
export const Car3D: React.FC<{
  color: string;
  position?: [number, number, number];
  // пройденный путь в метрах — по нему крутятся колёса
  distance?: number;
}> = ({ color, position = [0, 0, 0], distance = 0 }) => {
  const paint = { color, metalness: 0.35, roughness: 0.35 };
  const front = -distance / 0.33;
  const rear = -distance / 0.36;
  return (
    <group position={position}>
      {/* днище */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.5, 0.08, 4.6]} />
        <meshStandardMaterial color={CARBON} />
      </mesh>
      {/* монокок */}
      <mesh position={[0, 0.42, -0.2]}>
        <boxGeometry args={[0.72, 0.45, 2.6]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {/* нос */}
      <mesh position={[0, 0.3, -2.0]}>
        <boxGeometry args={[0.32, 0.22, 1.4]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {/* понтоны */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.36, 0.35]}>
          <boxGeometry args={[0.5, 0.38, 1.5]} />
          <meshStandardMaterial {...paint} />
        </mesh>
      ))}
      {/* капот двигателя и воздухозаборник */}
      <mesh position={[0, 0.55, 0.95]}>
        <boxGeometry args={[0.5, 0.5, 1.4]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh position={[0, 0.88, 0.2]}>
        <boxGeometry args={[0.3, 0.28, 0.45]} />
        <meshStandardMaterial color={CARBON} />
      </mesh>
      {/* шлем и halo */}
      <mesh position={[0, 0.78, -0.4]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color="#f5d000" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.98, -0.45]}>
        <boxGeometry args={[0.5, 0.05, 0.6]} />
        <meshStandardMaterial color={CARBON} />
      </mesh>
      {/* переднее антикрыло */}
      <mesh position={[0, 0.14, -2.6]}>
        <boxGeometry args={[1.9, 0.05, 0.38]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0.22, -2.6]}>
          <boxGeometry args={[0.04, 0.2, 0.42]} />
          <meshStandardMaterial color={CARBON} />
        </mesh>
      ))}
      {/* заднее антикрыло */}
      <mesh position={[0, 1.0, 2.2]}>
        <boxGeometry args={[1.3, 0.06, 0.4]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} position={[x, 0.8, 2.2]}>
          <boxGeometry args={[0.05, 0.5, 0.5]} />
          <meshStandardMaterial color={CARBON} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 2.05]}>
        <boxGeometry args={[0.08, 0.5, 0.12]} />
        <meshStandardMaterial color={CARBON} />
      </mesh>
      {/* стоп-сигнал */}
      <mesh position={[0, 0.3, 2.32]}>
        <boxGeometry args={[0.12, 0.06, 0.02]} />
        <meshStandardMaterial
          color="#ff2010"
          emissive="#ff2010"
          emissiveIntensity={2}
        />
      </mesh>
      {/* колёса */}
      <Wheel
        position={[-0.86, 0.33, -1.55]}
        radius={0.33}
        width={0.38}
        spin={front}
      />
      <Wheel
        position={[0.86, 0.33, -1.55]}
        radius={0.33}
        width={0.38}
        spin={front}
      />
      <Wheel
        position={[-0.86, 0.36, 1.55]}
        radius={0.36}
        width={0.46}
        spin={rear}
      />
      <Wheel
        position={[0.86, 0.36, 1.55]}
        radius={0.36}
        width={0.46}
        spin={rear}
      />
    </group>
  );
};
