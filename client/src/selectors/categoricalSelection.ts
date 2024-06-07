/* App dependencies */
import { RootState } from "../reducers";
import { CategoricalSelection } from "../util/stateManager/controlsHelpers";

/*
 Returns true if categorical selection controls have been touched indicating work is in progress.
 @param categoricalSelection from state
 @returns boolean
 */

export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { categoricalSelection } = state;

  return Boolean(isCategoricalSelectionInProgress(categoricalSelection));
};

/*
 Returns true if any categorical selection is in progress.
 Categorical selection is in progress when any categorical cell is unselected.
 @param categoricalSelection
 @returns boolean
 */
const isCategoricalSelectionInProgress = (
  categoricalSelection: CategoricalSelection
): boolean => {
  let categoricalInProgress = false;
  if (categoricalSelection) {
    for (const selectedByCategoryCells of Object.values(categoricalSelection)) {
      if (selectedByCategoryCells.size > 0) {
        const selections = Array.from(selectedByCategoryCells.values());
        const unselected = selections.some((selected) => !selected);
        if (unselected) {
          categoricalInProgress = true;
          break;
        }
      }
    }
  }
  return categoricalInProgress;
};
