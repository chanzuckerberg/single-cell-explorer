import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HotkeysProvider, FocusStyleManager } from "@blueprintjs/core";

import "./index.css";

/* our code */
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "util/queryClient";
import App from "./components/App/App";
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
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <HotkeysProvider>
        <App />
      </HotkeysProvider>
    </Provider>
  </QueryClientProvider>
);
