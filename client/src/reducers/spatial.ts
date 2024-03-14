import { AnyAction } from "redux";

interface SpatialMetadataState {
  loading: boolean;
  error: Error | null;
  metadata: Record<string, unknown> | null;
  image: ImageData | null;
}

const Spatial = (
  state: SpatialMetadataState = {
    loading: false,
    error: null,
    metadata: null,
    image: null,
  },
  action: AnyAction
): SpatialMetadataState => {
  switch (action.type) {
    case "request spatial metadata started":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "request spatial metadata success":
      return {
        ...state,
        loading: false,
        metadata: action.data,
      };
    case "request spatial image success":
      return {
        ...state,
        loading: false,
        image: action.data,
      };
    case "request spatial metadata error":
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    default:
      return state;
  }
};

export default Spatial;
