import { RootState } from "../reducers";
import { ConfigState } from "../reducers/config";

export function selectConfig(state: RootState): ConfigState {
  return state.config;
}

export function selectS3URI(state: RootState): ConfigState["s3URI"] {
  const config = selectConfig(state);

  return config.s3URI;
}

export function selectIsDeepZoomSourceValid(
  state: RootState
): ConfigState["isDeepZoomSourceValid"] {
  const config = selectConfig(state);

  return config.isDeepZoomSourceValid;
}
