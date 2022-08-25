import type { AnyAction } from "redux";

export interface CentroidLabelsState {
  showLabels: boolean;
}

const initialState: CentroidLabelsState = {
  showLabels: false,
};

const centroidLabels = (
  state = initialState,
  action: AnyAction,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  sharedNextState: any
): CentroidLabelsState => {
  const {
    colors: { colorAccessor },
  } = sharedNextState;

  const showLabels = action.showLabels ?? state.showLabels;

  switch (action.type) {
    case "color by categorical metadata":
    case "show centroid labels for category":
      // If colorby is not enabled or labels are not toggled to show
      // then clear the labels and make sure the toggle is off
      return {
        ...state,
        showLabels: colorAccessor && showLabels,
      };

    case "reset centroid labels":
      return initialState;

    default:
      return state;
  }
};

export default centroidLabels;
