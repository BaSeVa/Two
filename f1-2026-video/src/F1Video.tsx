import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { AbsoluteFill, getStaticFiles, staticFile } from "remotion";
import { Field, FIELD_DURATION } from "./scenes/Field";
import { Form, FORM_DURATION } from "./scenes/Form";
import { Intro, INTRO_DURATION } from "./scenes/Intro";
import { Outro, OUTRO_DURATION } from "./scenes/Outro";
import { Podium, PODIUM_DURATION } from "./scenes/Podium";
import { Season, SEASON_DURATION } from "./scenes/Season";
import { Trend, TREND_DURATION } from "./scenes/Trend";

const T = 14;

// Порядок сцен; scripts/make_sfx.py читает его же, чтобы попадать звуком в кадр
const SCENES: {
  name: string;
  Component: React.FC;
  duration: number;
  enter: "wipe" | "slide" | null;
}[] = [
  { name: "Intro", Component: Intro, duration: INTRO_DURATION, enter: null },
  {
    name: "Season",
    Component: Season,
    duration: SEASON_DURATION,
    enter: "wipe",
  },
  {
    name: "Trend",
    Component: Trend,
    duration: TREND_DURATION,
    enter: "slide",
  },
  {
    name: "Field",
    Component: Field,
    duration: FIELD_DURATION,
    enter: "slide",
  },
  {
    name: "Podium",
    Component: Podium,
    duration: PODIUM_DURATION,
    enter: "slide",
  },
  {
    name: "Form",
    Component: Form,
    duration: FORM_DURATION,
    enter: "slide",
  },
  {
    name: "Outro",
    Component: Outro,
    duration: OUTRO_DURATION,
    enter: "wipe",
  },
];

export const F1_VIDEO_DURATION =
  SCENES.reduce((sum, s) => sum + s.duration, 0) - (SCENES.length - 1) * T;

// Музыка из ElevenLabs (scripts/generate-soundtrack.mjs); без неё играют только синтезированные эффекты
const SOUNDTRACK = "soundtrack.mp3";
const hasSoundtrack = () => getStaticFiles().some((f) => f.name === SOUNDTRACK);

export const F1Video: React.FC = () => {
  const music = hasSoundtrack();
  return (
    <AbsoluteFill>
      {music ? <Audio src={staticFile(SOUNDTRACK)} volume={0.85} /> : null}
      <Audio src={staticFile("sfx.wav")} volume={music ? 0.55 : 1} />
      <TransitionSeries>
        {SCENES.map(({ name, Component, duration, enter }) => (
          <React.Fragment key={name}>
            {enter === "wipe" ? (
              <TransitionSeries.Transition
                presentation={wipe({ direction: "from-left" })}
                timing={linearTiming({ durationInFrames: T })}
              />
            ) : null}
            {enter === "slide" ? (
              <TransitionSeries.Transition
                presentation={slide({ direction: "from-right" })}
                timing={linearTiming({ durationInFrames: T })}
              />
            ) : null}
            <TransitionSeries.Sequence name={name} durationInFrames={duration}>
              <Component />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
