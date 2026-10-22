import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, getStaticFiles, staticFile } from "remotion";

// Атмосферная вставка из Kling (scripts/generate-kling-clips.mjs) под графикой сцены.
// Пока клипа нет в public/kling, вместо него показывается fallback (3D-сцена), а без него — обычный фон.
export const KlingClip: React.FC<{
  id: string;
  opacity: number;
  fallback?: React.ReactNode;
}> = ({ id, opacity, fallback }) => {
  const file = `kling/${id}.mp4`;
  const hasClip = getStaticFiles().some((f) => f.name === file);
  if (!hasClip && !fallback) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      {hasClip ? (
        <Video
          src={staticFile(file)}
          muted
          loop
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        fallback
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(11,11,16,0.55), rgba(11,11,16,0.2) 40%, rgba(11,11,16,0.75))",
        }}
      />
    </AbsoluteFill>
  );
};

// 3D-фон без варианта из Kling: то же затемнение, что и у вставок
export const Backdrop: React.FC<{
  opacity: number;
  children: React.ReactNode;
}> = ({ opacity, children }) => (
  <AbsoluteFill style={{ opacity }}>
    {children}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(11,11,16,0.55), rgba(11,11,16,0.2) 40%, rgba(11,11,16,0.75))",
      }}
    />
  </AbsoluteFill>
);
