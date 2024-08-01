import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { GetState } from "../../reducers";

export function thunkTrackColorByContinuousHistogram() {
  return (_: unknown, getState: GetState) => {
    const {
      colors: { colorMode },
    } = getState();

    const isColorByContinuousHistogram =
      colorMode === "color by continuous metadata";

    if (!isColorByContinuousHistogram) return;

    track(EVENTS.EXPLORER_COLORBY_HISTOGRAM_CONTINUOUS_BUTTON_CLICKED);
  };
}
