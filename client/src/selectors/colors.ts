/* App dependencies */
import { RootState } from "../reducers";

/*
 Returns true if categorical metadata color selection controls have been touched indicating work is in progress.
 @param colors from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { colors } = state;

  return Boolean(colors.colorAccessor);
};
