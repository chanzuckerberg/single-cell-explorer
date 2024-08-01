/* App dependencies */
import { type AnnotationColumnSchema } from "../common/types/schema";
import { type RootState } from "../reducers";

/*
 Returns true if user defined category has been created indicating work is in progress.
 @param annoMatrix from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const { annoMatrix } = state;

  return Boolean(
    annoMatrix?.schema.annotations.obs.columns.some(
      (col: AnnotationColumnSchema) => col.writable
    )
  );
};
