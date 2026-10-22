import { Composition, Folder } from "remotion";
import { F1Video, F1_VIDEO_DURATION } from "./F1Video";
import { Field, FIELD_DURATION } from "./scenes/Field";
import { Intro, INTRO_DURATION } from "./scenes/Intro";
import { Outro, OUTRO_DURATION } from "./scenes/Outro";
import { Podium, PODIUM_DURATION } from "./scenes/Podium";
import { Season, SEASON_DURATION } from "./scenes/Season";
import { FPS, HEIGHT, WIDTH, fontsLoaded } from "./theme";

// Шрифты подгружаются до первого кадра
void fontsLoaded;

const common = { fps: FPS, width: WIDTH, height: HEIGHT };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="F1DriversChampionship2026"
        component={F1Video}
        durationInFrames={F1_VIDEO_DURATION}
        {...common}
      />
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={Intro}
          durationInFrames={INTRO_DURATION}
          {...common}
        />
        <Composition
          id="Season"
          component={Season}
          durationInFrames={SEASON_DURATION}
          {...common}
        />
        <Composition
          id="Field"
          component={Field}
          durationInFrames={FIELD_DURATION}
          {...common}
        />
        <Composition
          id="Podium"
          component={Podium}
          durationInFrames={PODIUM_DURATION}
          {...common}
        />
        <Composition
          id="Outro"
          component={Outro}
          durationInFrames={OUTRO_DURATION}
          {...common}
        />
      </Folder>
    </>
  );
};
