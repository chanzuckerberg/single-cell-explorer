import { type ShouldShowOpenseadragonProps } from "../common/selectors";
import { ConfigState } from "../reducers/config";

export function selectConfig(state: ShouldShowOpenseadragonProps): ConfigState {
  return state.config;
}

export function selectS3URI(
  state: ShouldShowOpenseadragonProps
): ConfigState["s3URI"] {
  const config = selectConfig(state);

  return config.s3URI;
}

export function selectIsDeepZoomSourceValid(
  state: ShouldShowOpenseadragonProps
): ConfigState["isDeepZoomSourceValid"] {
  const config = selectConfig(state);

  return config.isDeepZoomSourceValid;
}
