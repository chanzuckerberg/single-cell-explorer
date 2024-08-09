import { spatialEmbeddingKeyword } from "../globals";
import { RootState } from "../reducers";
import { selectIsDeepZoomSourceValid, selectS3URI } from "../selectors/config";

export function isSpatialMode(props: ShouldShowOpenseadragonProps): boolean {
  const { layoutChoice, panelEmbedding, unsMetadata } = props;

  const isNotSupported = unsMetadata?.resolution === ""; // In case of slide-seq, resolution is empty

  const { open, layoutChoice: panelEmbeddingLayoutChoice } =
    panelEmbedding || {};

  const isPanelEmbeddingInSpatialMode =
    /**
     * (thuang): If the side panel is not open, don't take its layout choice into account
     */
    open &&
    panelEmbeddingLayoutChoice?.current?.includes(spatialEmbeddingKeyword);

  return Boolean(
    (layoutChoice?.current?.includes(spatialEmbeddingKeyword) &&
      !isNotSupported) ||
      isPanelEmbeddingInSpatialMode
  );
}

/**
 * (thuang): Selector to determine if the OpenSeadragon viewer should be shown
 */

export interface ShouldShowOpenseadragonProps {
  config: RootState["config"];
  layoutChoice: RootState["layoutChoice"];
  panelEmbedding?: RootState["panelEmbedding"];
  unsMetadata: RootState["controls"]["unsMetadata"];
}

export function shouldShowOpenseadragon(props: ShouldShowOpenseadragonProps) {
  return (
    selectIsDeepZoomSourceValid(props) &&
    selectS3URI(props) &&
    isSpatialMode(props)
  );
}
