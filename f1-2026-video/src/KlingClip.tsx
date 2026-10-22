import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, getStaticFiles, staticFile } from "remotion";

// Атмосферная вставка из Kling (scripts/generate-kling-clips.mjs) под графикой сцены.
// Пока клипа нет в public/kling, сцена остаётся на обычном фоне.
export const KlingClip: React.FC<{ id: string; opacity: number }> = ({
  id,
  opacity,
}) => {
  const file = `kling/${id}.mp4`;
  if (!getStaticFiles().some((f) => f.name === file)) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      <Video
        src={staticFile(file)}
        muted
        loop
        objectFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(11,11,16,0.55), rgba(11,11,16,0.2) 40%, rgba(11,11,16,0.75))",
        }}
      />
    </AbsoluteFill>
  );
};
