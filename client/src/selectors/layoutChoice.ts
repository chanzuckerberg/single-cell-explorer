import { EmbeddingSchema } from "../common/types/schema";
import { type RootState } from "../reducers";

export function selectAvailableLayouts(state: RootState): string[] {
  const { annoMatrix } = state;

  return (annoMatrix?.schema?.layout?.obs || [])
    .map((v: EmbeddingSchema) => v.name)
    .sort();
}
