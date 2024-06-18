/* App dependencies */
/*
 Returns true if individual genes have been created indicating work is in progress.
 @param controls from state
 @returns boolean
 */

import { RootState } from "../reducers";

export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { quickGenes } = state;

  return Boolean(quickGenes?.userDefinedGenes?.length);
};
