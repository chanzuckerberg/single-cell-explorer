import { spatialEmbeddingKeyword } from "../globals";
import { RootState } from "../reducers";

export function isSpatialMode(props: Partial<RootState>) {
  const { layoutChoice } = props;

  return layoutChoice?.current?.includes(spatialEmbeddingKeyword);
}
