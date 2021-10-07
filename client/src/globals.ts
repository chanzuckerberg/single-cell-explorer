import { Colors } from "@blueprintjs/core";
import { dispatchNetworkErrorMessageToUser } from "./util/actionHelpers";
import ENV_DEFAULT from "../../environment.default.json";
import { DataPortalProps } from "./common/types/entities";

/* overflow category values are created  using this string */
export const overflowCategoryLabel = ": all other labels";

/* default "unassigned" value for user-created categorical metadata */
export const unassignedCategoryLabel = "unassigned";

/**
 * Matches "/" followed by "ONE_OR_MORE_ANY_CHAR/ONE_OR_MORE_ANY_CHAR_EXCEPT_FORWARD_SLASH/" and ending with "api". Must
 * exclude forward slash to prevent matches on multiple path segments (e.g. /cellxgene/d/uuid.cxg).
 */
const REGEX_PATHNAME = /(?<=\/)\w+\/[^/]+\/(?=api)/;

/* Config links types */
export type ConfigLink = "about-dataset" | "collections-home-page";

/* rough shape of config object */
export interface Config {
  corpora_props: DataPortalProps;
  features: Record<string, unknown>;
  displayNames: Record<string, unknown>;
  library_versions: LibraryVersions;
  parameters: {
    about_legal_privacy?: string;
    about_legal_tos?: string;
    "disable-diffexp"?: boolean;
    "diffexp-may-be-slow"?: boolean;
    default_embedding?: string;
    [key: string]: unknown;
  };
  portalUrl: string;
  links: Record<ConfigLink, unknown>;
}

/* shape of config library_versions */
export interface LibraryVersions {
  anndata: string;
  cellxgene: string;
}

/*
these are default values for configuration the CLI may supply.
See the REST API and CLI specs for more info.
*/
export const configDefaults: Config = {
  features: {},
  displayNames: {},
  parameters: {
    "disable-diffexp": false,
    "diffexp-may-be-slow": false,
  },
  // @ts-expect-error -- Revisit typings here with respect to CLI defaults
  links: {},
};

/*
Most configuration is stored in the reducer.  A handful of values
are global and stored here.  They are typically set by the config
action handler, which pull the information from the backend/CLI.

All should be set here to their default value.
*/
export const globalConfig = {
  /* if a categorical metadata field has more options than this, truncate */
  maxCategoricalOptionsToDisplay: 200,
};

/* colors */
export const blue = Colors.BLUE3;
export const linkBlue = Colors.BLUE5;
export const lightestGrey = "rgb(249,249,249)";
export const lighterGrey = "rgb(245,245,245)";
export const lightGrey = Colors.LIGHT_GRAY1;
export const mediumGrey = "rgb(153,153,153)";
export const darkGrey = "rgb(102,102,102)";
export const darkerGrey = "rgb(51,51,51)";

export const brightBlue = "#4a90e2";
export const brightGreen = "#A2D729";
export const darkGreen = "#448C4D";

export const nonFiniteCellColor = lightGrey;
export const defaultCellColor = "rgb(0,0,0,1)";
export const logoColor = "black"; /* logo pink: "#E9429A" */

/* typography constants */

export const tiniestFontSize = 12;
export const largestFontSize = 24;
export const uppercaseLetterSpacing = "0.04em";
export const bolder = 700;
export const accentFont = "Georgia,Times,Times New Roman,serif";
export const maxParagraphWidth = 600;

/* layout styles constants */

export const cellxgeneTitleLeftPadding = 14;
export const cellxgeneTitleTopPadding = 7;

export const datasetTitleMaxCharacterCount = 25;

export const maxControlsWidth = 800;

export const graphMargin = { top: 20, right: 10, bottom: 30, left: 40 };
export const graphWidth = 700;
export const graphHeight = 700;
export const scatterplotMarginLeft = 11;

export const rightSidebarWidth = 365;
export const leftSidebarWidth = 365;
export const leftSidebarSectionHeading = {
  fontSize: 18,
  textTransform: "uppercase",
  fontWeight: 500,
  letterSpacing: ".05em",
};
export const leftSidebarSectionPadding = 10;
export const categoryLabelDisplayStringLongLength = 27;
export const categoryLabelDisplayStringShortLength = 11;
export const categoryDisplayStringMaxLength = 33;

export const maxUserDefinedGenes = 25;
export const maxGenes = 100;

export const diffexpPopNamePrefix1 = "Pop1 high";
export const diffexpPopNamePrefix2 = "Pop2 high";

/* various timing-related behaviors */
export const tooltipHoverOpenDelay = 1000; /* ms delay before a tooltip displays */
export const tooltipHoverOpenDelayQuick = 500;

const CXG_SERVER_PORT =
  process.env.CXG_SERVER_PORT || ENV_DEFAULT.CXG_SERVER_PORT;

let _API;

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
if ((window as any).CELLXGENE && (window as any).CELLXGENE.API) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  _API = (window as any).CELLXGENE.API;
} else {
  if (CXG_SERVER_PORT === undefined) {
    const errorMessage = "Please set the CXG_SERVER_PORT environment variable.";
    dispatchNetworkErrorMessageToUser(errorMessage);
    throw new Error(errorMessage);
  }

  _API = {
    // prefix: "http://api.clustering.czi.technology/api/",
    // prefix: "http://tabulamuris.cxg.czi.technology/api/",
    // prefix: "http://api-staging.clustering.czi.technology/api/",
    prefix: `http://localhost:${CXG_SERVER_PORT}/api/`,
    version: "v0.2/",
  };
}

export const API = _API;

/**
 * Update the base API URL for the current dataset using the current origin and pathname.
 */
export function updateApiPrefix(): void {
  if (typeof window === "undefined") {
    throw new Error("Unable to set API route.");
  }
  const { location } = window;
  // Remove leading slash as regex uses leading slash in lookbehind and is therefore not replaced.
  const pathname = location.pathname.substring(1);
  // For the API prefix in the format protocol/host/pathSegement/e/uuid.cxg, replace /e/uuid.cxg with the corresponding
  // path segments taken from the pathname.
  API.prefix = API.prefix.replace(REGEX_PATHNAME, pathname);
}
