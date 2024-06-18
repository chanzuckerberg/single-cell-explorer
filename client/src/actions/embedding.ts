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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
async function _switchEmbedding(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  prevAnnoMatrix: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  prevCrossfilter: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  newEmbeddingName: any,
  prevEmbeddingName = ""
) {
  /**
   * DRY helper used by embedding action creators
   */
  const base = prevAnnoMatrix.base();

  const embeddingDf = await base.fetch(
    "emb",
    newEmbeddingName,
    globals.numBinsEmb
  );

  const annoMatrix = _setEmbeddingSubset(prevAnnoMatrix, embeddingDf);

  const obsCrossfilter = await new AnnoMatrixObsCrossfilter(
    annoMatrix,
    prevCrossfilter.obsCrossfilter
  )
    /**
     * (thuang + seve): When switching embeddings, if the previous selection mode is "all",
     * we should remove the embedding dimension from the crossfilter. Otherwise, the crossfilter
     * will select the intersection of the total cell counts between the previous embedding and
     * the new embedding. If the two embeddings have different cell counts, this will result in a bug.
     * See the issue for more details: https://github.com/chanzuckerberg/single-cell-explorer/issues/858
     */
    .dropDimension(Field.emb, prevEmbeddingName)
    .select(Field.emb, newEmbeddingName, {
      mode: "all",
    });

  return [annoMatrix, obsCrossfilter];
}

export const layoutChoiceAction: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<"set layout choice">>
> =
  (newLayoutChoice: string, isSidePanel = false) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    if (isSidePanel) {
      dispatch({
        type: "set panel embedding layout choice",
        layoutChoice: newLayoutChoice,
      });
      return;
    }
    /**
     * Bruce: On layout choice, make sure we have selected all on the previous layout, AND the new
     * layout.
     */
    const {
      annoMatrix: prevAnnoMatrix,
      obsCrossfilter: prevCrossfilter,
      layoutChoice: prevLayoutChoice,
      graphSelection: { selection },
    } = getState();

    /**
     * (thuang + seve): When switching embeddings, if the previous selection mode is "all",
     * we should remove the embedding dimension from the crossfilter. Otherwise, the crossfilter
     * will select the intersection of the total cell counts between the previous embedding and
     * the new embedding. If the two embeddings have different cell counts, this will result in a bug.
     * See the issue for more details: https://github.com/chanzuckerberg/single-cell-explorer/issues/858
     */
    const shouldRemoveEmbeddingDimension = selection?.mode === "all";

    const [annoMatrix, obsCrossfilter] = await _switchEmbedding(
      prevAnnoMatrix,
      prevCrossfilter,
      newLayoutChoice,
      shouldRemoveEmbeddingDimension ? prevLayoutChoice.current : ""
    );

    dispatch({
      type: "set layout choice",
      layoutChoice: newLayoutChoice,
      obsCrossfilter,
      annoMatrix,
    });
  };

export const swapLayoutChoicesAction: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<"set layout choice">>
> =
  () =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { layoutChoice, panelEmbedding } = getState();
    // get main and side layout choices
    const mainLayoutChoice = layoutChoice.current;
    const sideLayoutChoice = panelEmbedding.layoutChoice.current;

    await dispatch(layoutChoiceAction(mainLayoutChoice, true));
    await dispatch(layoutChoiceAction(sideLayoutChoice, false));
  };
