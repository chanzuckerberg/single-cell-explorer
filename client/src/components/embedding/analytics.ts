import { isColorByHistogramColorMode, track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { GetState } from "../../reducers";
import { SelectionMode } from "../../util/typedCrossfilter/types";

export function thunkTrackColorByCategoryChangeEmbedding() {
  return (_: unknown, getState: GetState) => {
    const {
      colors: { colorMode },
    } = getState();

    const isColorByCategory = colorMode === "color by categorical metadata";

    if (!isColorByCategory) return;

    track(EVENTS.EXPLORER_COLORBY_CATEGORY_CHANGE_EMBEDDING);
  };
}

export function thunkTrackColorByHistogramChangeEmbedding() {
  return (_: unknown, getState: GetState) => {
    const {
      colors: { colorMode },
    } = getState();

    const isColorByHistogram = isColorByHistogramColorMode(colorMode);

    if (!isColorByHistogram) return;

    track(EVENTS.EXPLORER_COLORBY_HISTOGRAM_CHANGE_EMBEDDING);
  };
}

export function thunkTrackLassoChangeEmbedding() {
  return (_: unknown, getState: GetState) => {
    const {
      graphSelection: { selection },
    } = getState();

    const { mode } = selection;

    if (mode !== SelectionMode.WithinPolygon) return;

    track(EVENTS.EXPLORER_LASSO_CHANGE_EMBEDDING);
  };
}
