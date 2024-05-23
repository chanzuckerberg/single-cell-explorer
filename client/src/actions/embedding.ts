/*
action creators related to embeddings choice
*/

import { Action, ActionCreator } from "redux";
import { ThunkAction } from "redux-thunk";
import { AnnoMatrixObsCrossfilter } from "../annoMatrix";
import type { AppDispatch, GetState, RootState } from "../reducers";
import { _setEmbeddingSubset } from "../util/stateManager/viewStackHelpers";
import { Field } from "../common/types/schema";
import * as globals from "../globals";
import { selectAvailableLayouts } from "../selectors/layoutChoice";
import AnnoMatrix from "../annoMatrix/annoMatrix";

export async function _switchEmbedding(
  prevAnnoMatrix: AnnoMatrix,
  prevCrossfilter: AnnoMatrixObsCrossfilter,
  newEmbeddingName: string
) {
  /*
  DRY helper used by embedding action creators
  */
  const base = prevAnnoMatrix.base();
  const embeddingDf = await base.fetch(
    Field.emb,
    newEmbeddingName,
    globals.numBinsEmb
  );
  const annoMatrix = _setEmbeddingSubset(prevAnnoMatrix, embeddingDf);
  const obsCrossfilter = await new AnnoMatrixObsCrossfilter(
    annoMatrix,
    prevCrossfilter.obsCrossfilter
  ).select(Field.emb, newEmbeddingName, {
    mode: "all",
  });
  return [annoMatrix, obsCrossfilter];
}

export const layoutChoiceAction: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<"set layout choice">>
> =
  (newLayoutChoice: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    /*
  On layout choice, make sure we have selected all on the previous layout, AND the new
  layout.
  */
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevCrossfilter } =
      getState();
    const [annoMatrix, obsCrossfilter] = await _switchEmbedding(
      prevAnnoMatrix,
      prevCrossfilter,
      newLayoutChoice
    );
    dispatch({
      type: "set layout choice",
      layoutChoice: newLayoutChoice,
      obsCrossfilter,
      annoMatrix,
    });
  };

export const initialLayoutChoiceAction: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<"set layout choice">>
> =
  (config: globals.Config) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevCrossfilter } =
      getState();
    const availableLayouts = selectAvailableLayouts({ prevAnnoMatrix });
    const fallbackLayout = getBestDefaultLayout(availableLayouts);
    const defaultLayout = config?.parameters?.default_embedding || "";

    const finalLayout = availableLayouts.includes(defaultLayout)
      ? defaultLayout
      : fallbackLayout;

    const [annoMatrix, obsCrossfilter] = await _switchEmbedding(
      prevAnnoMatrix,
      prevCrossfilter,
      finalLayout
    );

    dispatch({
      type: "set layout choice",
      layoutChoice: finalLayout,
      obsCrossfilter,
      annoMatrix,
    });
  };

function getBestDefaultLayout(layouts: Array<string>): string {
  const preferredNames = ["umap", "tsne", "pca"];
  const idx = preferredNames.findIndex((name) => layouts.indexOf(name) !== -1);
  if (idx !== -1) return preferredNames[idx];
  return layouts[0];
}
