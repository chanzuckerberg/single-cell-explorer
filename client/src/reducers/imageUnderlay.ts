import { Action } from "redux";

interface ImageUnderlayState {
  isActive: boolean;
}

const ImageUnderlay = (
  state: ImageUnderlayState = {
    isActive: true,
  },
  action: Action
): ImageUnderlayState => {
  switch (action.type) {
    case "toggle image underlay":
      return {
        ...state,
        isActive: !state.isActive,
      };
    default:
      return state;
  }
};

export default ImageUnderlay;
