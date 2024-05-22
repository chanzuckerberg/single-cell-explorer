import { EmbeddingSchema } from "../common/types/schema";
import { type RootState } from "../reducers";
import { selectAnnoMatrix } from "./annoMatrix";

export function selectAvailableLayouts(state: RootState): string[] {
  const annoMatrix = selectAnnoMatrix(state);

  return (annoMatrix.schema?.layout?.obs || [])
    .map((v: EmbeddingSchema) => v.name)
    .sort();
}
