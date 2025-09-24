/* App dependencies */
import { type RootState } from "../reducers";
import { needToSaveObsAnnotations } from "../actions/annotation";

/*
 Returns true if user defined category has been created indicating work is in progress.
 @param annoMatrix from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { annoMatrix, autosave } = state;

  if (!annoMatrix || !autosave?.lastSavedAnnoMatrix) return false;

  return needToSaveObsAnnotations(annoMatrix, autosave.lastSavedAnnoMatrix);
};
