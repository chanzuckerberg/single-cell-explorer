/* App dependencies */
import AnnoMatrix from "../annoMatrix/annoMatrix";
import { AnnotationColumnSchema } from "../common/types/schema";
import { type RootState } from "../reducers";

export const selectAnnoMatrix = (state: RootState): AnnoMatrix =>
  state.annoMatrix;

/*
 Returns true if user defined category has been created indicating work is in progress.
 @param annoMatrix from state
 @returns boolean
 */
export const selectIsUserStateDirty = (state: RootState): boolean => {
  const annoMatrix = selectAnnoMatrix(state);

  return Boolean(
    annoMatrix?.schema.annotations.obs.columns.some(
      (col: AnnotationColumnSchema) => col.writable
    )
  );
};

export function selectSchema(state: RootState) {
  const annoMatrix = selectAnnoMatrix(state);
  return annoMatrix?.schema;
}
