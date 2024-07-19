import { Action, ActionCreator } from "redux";
import { ThunkAction } from "redux-thunk";
import { AppDispatch, GetState, RootState } from "../reducers";
import {
  isColorByHistogramColorMode,
  trackColorByCategoryExpand,
  trackColorByHistogramExpandCategory,
} from "../analytics";

export const toggleCategoryExpansion: ActionCreator<
  ThunkAction<
    Promise<void>,
    RootState,
    never,
    Action<"controls category expansion change">
  >
> =
  (category: string, isExpanding: boolean) =>
  async (dispatch: AppDispatch, getState: GetState) => {
    dispatch({
      type: "controls category expansion change",
      category,
    });

    const {
      colors: { colorMode },
    } = getState();

    trackColorByCategoryExpand(
      colorMode === "color by categorical metadata",
      isExpanding
    );

    trackColorByHistogramExpandCategory(
      isColorByHistogramColorMode(colorMode),
      isExpanding
    );
  };
