/* App dependencies */

import { RootState } from "../reducers";

/*
 Returns true if genesets have been created indicating work is in progress.
 @param genesets from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { genesets } = state;

  return Boolean(genesets?.genesets?.size);
};
