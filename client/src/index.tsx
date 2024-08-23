import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HotkeysProvider, FocusStyleManager } from "@blueprintjs/core";

import "./index.css";
import "web-streams-polyfill/polyfill";

/* our code */
import App from "./components/app";
import store from "./reducers";

/**
 * These are imported for Webpack asset/resource module
 * to bundle in order to be used in obsolete browser template
 */
import "./assets/img/safari.png";
import "./assets/img/chrome.png";
import "./assets/img/firefox.png";
import "./assets/img/edge.png";
import "./assets/img/cellxgene.png";

/**
 * These are imported for Webpack asset/resource module
 * to bundle in order to be used in open graph meta tags
 */
import "./assets/img/cxg-explorer-og.jpg";

import { checkFeatureFlags } from "./util/featureFlags/featureFlags";

FocusStyleManager.onlyShowFocusOnTabs();

// check URL for feature flags
checkFeatureFlags();

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <HotkeysProvider>
      <App />
    </HotkeysProvider>
  </Provider>
);
