/* App dependencies */
import { AnnotationColumnSchema } from "../common/types/schema";
import { RootState } from "../reducers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- - FIXME: unexpected any.
export const selectAnnoMatrix = (state: RootState): any => state.annoMatrix;

/*
 Returns true if user defined category controls have been touched indicating work is in progress.
 @param annoMatrix from state
 @returns boolean
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: Argument 'state' should be typed... Remove this comment to see the full error message.
export const selectIsUserStateDirty = (state: any): boolean => {
  const annoMatrix = selectAnnoMatrix(state);

  return Boolean(
    annoMatrix?.schema.annotations.obs.columns.some(
      (col: AnnotationColumnSchema) => col.writable
    )
  );
};
