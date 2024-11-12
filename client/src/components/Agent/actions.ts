import { AppDispatch, GetState } from "../../reducers";
import { subsetAction, resetSubsetAction } from "../../actions/viewStack";

export const performSubset =
  () => (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const crossfilter = state.obsCrossfilter;
    if (!crossfilter) return;
    const selectedCount = crossfilter.countSelected();
    const subsetPossible =
      selectedCount !== 0 && selectedCount !== crossfilter.size();

    if (subsetPossible) {
      dispatch(subsetAction());
    }
  };

export const performUnsubset = () => (dispatch: AppDispatch) => {
  dispatch(resetSubsetAction());
};

export const performCategoricalSelection =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed categorical selection");
  };

export const performHistogramSelection =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed histogram selection");
  };

export const performPanning =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed panning");
  };

export const performZoomIn =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed zoom in");
  };

export const performZoomOut =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed zoom out");
  };

export const performColorByGene =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed color by gene");
  };

export const performColorByGeneset =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed color by geneset");
  };

export const performColorByCategory =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed color by category");
  };

export const performColorByContinuous =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed color by continuous variable");
  };

export const performCreateGeneset =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed create geneset");
  };

export const performXYScatterplot =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed XY scatterplot");
  };

export const performShowCellGuide =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed show cell guide");
  };

export const performShowGeneCard =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed show gene card");
  };
