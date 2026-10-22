import { useThree } from "@react-three/fiber";
import React from "react";

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
    camera.far = 3000;
    camera.updateProjectionMatrix();
  }
  return null;
};
