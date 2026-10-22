import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Field, FIELD_DURATION } from "./scenes/Field";
import { Intro, INTRO_DURATION } from "./scenes/Intro";
import { Outro, OUTRO_DURATION } from "./scenes/Outro";
import { Podium, PODIUM_DURATION } from "./scenes/Podium";
import { Race, RACE_DURATION } from "./scenes/Race";

const T = 14;

export const F1_VIDEO_DURATION =
  INTRO_DURATION +
  RACE_DURATION +
  FIELD_DURATION +
  PODIUM_DURATION +
  OUTRO_DURATION -
  4 * T;

export const F1Video: React.FC = () => (
  <AbsoluteFill>
    <Audio src={staticFile("sfx.wav")} />
    <TransitionSeries>
      <TransitionSeries.Sequence name="Intro" durationInFrames={INTRO_DURATION}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: T })}
      />
      <TransitionSeries.Sequence name="Race" durationInFrames={RACE_DURATION}>
        <Race />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: T })}
      />
      <TransitionSeries.Sequence name="Field" durationInFrames={FIELD_DURATION}>
        <Field />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: T })}
      />
      <TransitionSeries.Sequence
        name="Podium"
        durationInFrames={PODIUM_DURATION}
      >
        <Podium />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: T })}
      />
      <TransitionSeries.Sequence name="Outro" durationInFrames={OUTRO_DURATION}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
