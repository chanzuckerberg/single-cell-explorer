/*
Reducer for showBottomBanner
*/

import { AnyAction } from "redux";
import {
  BOTTOM_BANNER_EXPIRATION_TIME_MS,
  BOTTOM_BANNER_LAST_CLOSED_TIME_KEY,
} from "../components/BottomBanner/constants";
import type { RootState } from "./index";

const showBanner = () => {
  const bottomBannerLastClosedTime = localStorage.getItem(
    BOTTOM_BANNER_LAST_CLOSED_TIME_KEY
  );
  const show =
    !bottomBannerLastClosedTime ||
    Date.now() - Number(bottomBannerLastClosedTime) >
      BOTTOM_BANNER_EXPIRATION_TIME_MS;
  if (show && bottomBannerLastClosedTime) {
    localStorage.setItem(BOTTOM_BANNER_LAST_CLOSED_TIME_KEY, "0");
  }
  return show;
};

const showBottomBanner = (_state: RootState, action: AnyAction): boolean => {
  switch (action.type) {
    case "initial data load start": {
      return showBanner();
    }
    case "update bottom banner last closed time": {
      localStorage.setItem(BOTTOM_BANNER_LAST_CLOSED_TIME_KEY, action.time);
      return showBanner();
    }
    default: {
      return showBanner();
    }
  }
};

export default showBottomBanner;
