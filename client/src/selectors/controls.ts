/* App dependencies */
import { RootState } from "../reducers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- - FIXME: unexpected any.
export const selectControls = (state: RootState): any => state.controls;

/*
 Returns true if the individual genes selection controls have been touched indicating work is in progress.
 @param controls from state
 @returns boolean
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: Argument 'state' should be typed... Remove this comment to see the full error message.
export const selectIsUserStateDirty = (state: any): boolean => {
  const controls = selectControls(state);

  return Boolean(controls?.userDefinedGenes?.length);
};
