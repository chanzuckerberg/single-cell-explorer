/* App dependencies */
import { RootState } from "../reducers";

/*
 Returns true if histogram brush controls have been touched indicating work is in progress.
 @param continuousSelection from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { continuousSelection } = state;

  return Boolean(Object.keys(continuousSelection).length);
};
