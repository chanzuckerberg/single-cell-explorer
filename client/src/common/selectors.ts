import { spatialEmbeddingKeyword } from "../globals";
import { RootState } from "../reducers";
import { selectIsDeepZoomSourceValid, selectS3URI } from "../selectors/config";
import { getFeatureFlag } from "../util/featureFlags/featureFlags";
import { FEATURES } from "../util/featureFlags/features";

export function isSpatialMode(props: ShouldShowOpenseadragonProps): boolean {
  const { layoutChoice, panelEmbedding } = props;

  return !!(
    layoutChoice?.current?.includes(spatialEmbeddingKeyword) ||
    panelEmbedding?.layoutChoice?.current?.includes(spatialEmbeddingKeyword)
  );
}

const isSpatial = getFeatureFlag(FEATURES.SPATIAL);

/**
 * (thuang): Selector to determine if the OpenSeadragon viewer should be shown
 */

export interface ShouldShowOpenseadragonProps {
  config: RootState["config"];
  layoutChoice: RootState["layoutChoice"];
  panelEmbedding?: RootState["panelEmbedding"];
}

export function shouldShowOpenseadragon(props: ShouldShowOpenseadragonProps) {
  return (
    isSpatial &&
    selectIsDeepZoomSourceValid(props) &&
    selectS3URI(props) &&
    isSpatialMode(props)
  );
}
