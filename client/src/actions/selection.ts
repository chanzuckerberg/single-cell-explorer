import { vec2 } from "gl-matrix";
import { track } from "../analytics";
import { EVENTS } from "../analytics/events";

/*
Action creators for selection
*/
export const selectContinuousMetadataAction =
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    type: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    query: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    range: any,
    oldProps = {} // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  async (dispatch: any, getState: any) => {
    const { obsCrossfilter: prevObsCrossfilter } = getState();

    const selection = range
      ? {
          mode: "range",
          lo: range[0],
          hi: range[1],
          inclusive: true, // [lo, hi] incluisve selection
        }
      : { mode: "all" };

    const obsCrossfilter = await prevObsCrossfilter.select(...query, selection);

    dispatch({
      type,
      obsCrossfilter,
      range,
      ...oldProps,
    });
  };

export const selectCategoricalMetadataAction =
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    type: any, // action type
    // annotation category name
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    metadataField: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    labels: any,
    // the label being selected/deselected
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    label: any,
    // bool
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    isSelected: any,
    oldProps = {}
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  async (dispatch: any, getState: any) => {
    const {
      obsCrossfilter: prevObsCrossfilter,
      categoricalSelection,
      annoMatrix,
    } = getState();

    const labelSelectionState = new Map(categoricalSelection[metadataField]);
    labels.forEach(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      (l: any) => labelSelectionState.has(l) || labelSelectionState.set(l, true)
    );
    labelSelectionState.set(label, isSelected);

    // Get selected label strings
    const selectedLabels = Array.from(labelSelectionState.keys()).filter((k) =>
      labelSelectionState.get(k)
    );

    const categoryDf = await annoMatrix.fetch("obs", metadataField);
    const column = categoryDf.icol(0);

    // Convert selected labels to their internal representation for crossfilter
    const selectionValues = selectedLabels.map((lbl) =>
      column.getInternalRep(lbl)
    );

    const selection = {
      mode: "exact",
      values: selectionValues,
    };
    const obsCrossfilter = await prevObsCrossfilter.select(
      "obs",
      metadataField,
      selection
    );

    dispatch({
      type,
      obsCrossfilter,
      metadataField,
      labelSelectionState,
      ...oldProps,
    });
  };

export const selectCategoricalAllMetadataAction =
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    type: any, // action type
    // annotation category name
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    metadataField: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    labels: any,
    // bool, select all or none
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    isSelected: any,
    oldProps = {}
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  async (dispatch: any, getState: any) => {
    const { obsCrossfilter: prevObsCrossfilter, categoricalSelection } =
      getState();

    const labelSelectionState = new Map(categoricalSelection[metadataField]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    labels.forEach((label: any) => labelSelectionState.set(label, isSelected));

    // Note: for "all" or "none" mode, we don't need to convert to codes
    // since the crossfilter selects everything or nothing regardless of values
    const selection = { mode: isSelected ? "all" : "none" };
    const obsCrossfilter = await prevObsCrossfilter.select(
      "obs",
      metadataField,
      selection
    );

    dispatch({
      type,
      obsCrossfilter,
      metadataField,
      labelSelectionState,
      ...oldProps,
    });
  };

/**
 ** Graph selection-related actions
 **/

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
export const graphBrushStartAction = () =>
  /* no change to crossfilter until a change fires */
  ({ type: "graph brush start" });

const _graphBrushWithinRectAction =
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    type: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    embName: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    brushCoords: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  ) =>
  async (dispatch: any, getState: any) => {
    const { obsCrossfilter: prevObsCrossfilter } = getState();

    const selection = { mode: "within-rect", ...brushCoords };
    const obsCrossfilter = await prevObsCrossfilter.select(
      "emb",
      embName,
      selection
    );

    dispatch({
      type,
      obsCrossfilter,
      brushCoords,
    });
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const _graphAllAction =
  (type: any, embName: any) =>
  async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    dispatch: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    getState: any
  ) => {
    const { obsCrossfilter: prevObsCrossfilter } = getState();

    const obsCrossfilter = await prevObsCrossfilter.select("emb", embName, {
      mode: "all",
    });

    dispatch({
      type,
      obsCrossfilter,
    });
  };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphBrushChangeAction = (embName: any, brushCoords: any) =>
  _graphBrushWithinRectAction("graph brush change", embName, brushCoords);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphBrushEndAction = (embName: any, brushCoords: any) =>
  _graphBrushWithinRectAction("graph brush end", embName, brushCoords);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphBrushCancelAction = (embName: any) =>
  _graphAllAction("graph brush cancel", embName);
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphBrushDeselectAction = (embName: any) =>
  _graphAllAction("graph brush deselect", embName);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
export const graphLassoStartAction = () =>
  /* no change to crossfilter until a change fires */
  ({ type: "graph lasso start" });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphLassoCancelAction = (embName: any) =>
  _graphAllAction("graph lasso cancel", embName);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphLassoDeselectAction = (embName: any) =>
  _graphAllAction("graph lasso cancel", embName);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const graphLassoEndAction =
  ({
    embName,
    polygon,
    graphId,
  }: {
    embName: string;
    polygon: vec2[];
    graphId: string;
  }) =>
  async (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    dispatch: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    getState: any
  ) => {
    const { obsCrossfilter: prevObsCrossfilter } = getState();

    const selection = {
      mode: "within-polygon",
      polygon,
    };
    const obsCrossfilter = await prevObsCrossfilter.select(
      "emb",
      embName,
      selection
    );

    dispatch({
      type: "graph lasso end",
      obsCrossfilter,
      polygon,
      graphId,
    });

    track(EVENTS.EXPLORER_LASSO);
  };

/*
Differential expression set selection
*/
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const setCellSetFromSelection =
  (cellSetId: any) =>
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    dispatch: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    getState: any
  ) => {
    const { obsCrossfilter } = getState();
    const selected = obsCrossfilter.allSelectedLabels();

    dispatch({
      type: `store current cell selection as differential set ${cellSetId}`,
      data: selected.length > 0 ? selected : null,
    });
  };

/*
Differential expression set selection with inversion
Assigns current selection to pop 1 and inverted selection (all remaining cells) to pop 2
*/
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const setCellSetsFromSelectionAndInvert =
  () =>
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    dispatch: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    getState: any
  ) => {
    const { obsCrossfilter } = getState();
    
    // Get current selection (combines all dimensions: lasso, histogram, categoricals)
    const selected = obsCrossfilter.allSelectedLabels();
    
    // Get all available labels
    const allLabels = obsCrossfilter.annoMatrix.rowIndex.labels();
    
    // Convert to Sets for efficient difference computation
    const selectedSet = new Set(
      Array.isArray(selected) ? selected : Array.from(selected)
    );
    const allLabelsArray = Array.isArray(allLabels) ? allLabels : Array.from(allLabels);
    
    // Compute inverted labels (all labels not in selected set)
    const invertedLabels = allLabelsArray.filter(
      (label) => !selectedSet.has(label)
    );
    
    // Convert back to Int32Array if original was Int32Array, otherwise keep as array
    const invertedLabelsArray = 
      allLabels instanceof Int32Array 
        ? new Int32Array(invertedLabels.filter((l): l is number => typeof l === "number"))
        : invertedLabels;
    
    // Assign selected labels to pop 1
    dispatch({
      type: "store current cell selection as differential set 1",
      data: selected.length > 0 ? selected : null,
    });
    
    // Assign inverted labels to pop 2
    dispatch({
      type: "store current cell selection as differential set 2",
      data: invertedLabelsArray.length > 0 ? invertedLabelsArray : null,
    });
  };
