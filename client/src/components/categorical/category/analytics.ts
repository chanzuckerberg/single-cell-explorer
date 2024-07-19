import {
  trackColorByCategoryExpand,
  trackColorByCategoryHighlightHistogram,
} from "../../../analytics";
import { GetState } from "../../../reducers";

export function thunkTrackColorByCategoryExpand(isColorByCategory: boolean) {
  return (_: unknown, getState: GetState) => {
    const {
      controls: { expandedCategories },
    } = getState();

    trackColorByCategoryExpand(
      isColorByCategory,
      expandedCategories.length > 0
    );
  };
}

export function thunkTrackColorByCategoryHighlightHistogram(
  isColorByCategory: boolean
) {
  return (_: unknown, getState: GetState) => {
    const { continuousSelection } = getState();

    trackColorByCategoryHighlightHistogram(
      isColorByCategory,
      Object.keys(continuousSelection).length > 0
    );
  };
}
