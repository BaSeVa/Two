import { Composition, Folder, Still } from "remotion";
import { Cover } from "./Cover";
import { F1Video, F1_VIDEO_DURATION } from "./F1Video";
import { Field, FIELD_DURATION } from "./scenes/Field";
import { Form, FORM_DURATION } from "./scenes/Form";
import { Intro, INTRO_DURATION } from "./scenes/Intro";
import { Outro, OUTRO_DURATION } from "./scenes/Outro";
import { Podium, PODIUM_DURATION } from "./scenes/Podium";
import { Season, SEASON_DURATION } from "./scenes/Season";
import { Trend, TREND_DURATION } from "./scenes/Trend";
import {
  Aerial3D,
  Finish3D,
  Overtake3D,
  PitLane3D,
  Podium3D,
  RaceLoop3D,
  StartGrid3D,
} from "./three/Backdrops";
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
      <Still id="Cover" component={Cover} width={WIDTH} height={HEIGHT} />
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
          id="Trend"
          component={Trend}
          durationInFrames={TREND_DURATION}
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
          id="Form"
          component={Form}
          durationInFrames={FORM_DURATION}
          {...common}
        />
        <Composition
          id="Outro"
          component={Outro}
          durationInFrames={OUTRO_DURATION}
          {...common}
        />
      </Folder>
      <Folder name="Backdrops3D">
        <Composition
          id="StartGrid3D"
          component={StartGrid3D}
          durationInFrames={INTRO_DURATION}
          defaultProps={{ lightsOut: 80 }}
          {...common}
        />
        <Composition
          id="RaceLoop3D"
          component={RaceLoop3D}
          durationInFrames={SEASON_DURATION}
          {...common}
        />
        <Composition
          id="Aerial3D"
          component={Aerial3D}
          durationInFrames={TREND_DURATION}
          {...common}
        />
        <Composition
          id="PitLane3D"
          component={PitLane3D}
          durationInFrames={FIELD_DURATION}
          {...common}
        />
        <Composition
          id="Overtake3D"
          component={Overtake3D}
          durationInFrames={FORM_DURATION}
          defaultProps={{
            colors: ["#3671C6", "#00D7B6", "#E8002D", "#00D7B6"],
          }}
          {...common}
        />
        <Composition
          id="Podium3D"
          component={Podium3D}
          durationInFrames={PODIUM_DURATION}
          {...common}
        />
        <Composition
          id="Finish3D"
          component={Finish3D}
          durationInFrames={OUTRO_DURATION}
          {...common}
        />
      </Folder>
    </>
  );
};
