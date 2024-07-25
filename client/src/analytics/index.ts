import { EVENTS } from "./events";
import { type GetState } from "../reducers";

declare global {
  interface Window {
    plausible: {
      q: unknown[];
      (event: EVENTS, options?: { props: { [key: string]: unknown } }): void;
    };
  }
}

export function track(event: EVENTS, props?: Record<string, unknown>): void {
  const options = props ? { props } : undefined;
  /**
   * (thuang): Log analytics events for debugging purposes
   * Please comment out before committing
   */
  console.log("track", event, options);
  
  try {
    window.plausible(event, options);
  } catch (error) {
    console.error(error);
  }
}

export function trackColorByCategoryExpand(
  isColorByCategory: boolean,
  isAnyCategoryExpanded: boolean
): void {
  if (!isColorByCategory || !isAnyCategoryExpanded) return;

  track(EVENTS.EXPLORER_COLORBY_CATEGORY_EXPAND);
}

export function trackColorByCategoryHighlightHistogram(
  isColorByCategory: boolean,
  isAnyHistogramHighlighted: boolean
): void {
  if (!isColorByCategory || !isAnyHistogramHighlighted) return;

  track(EVENTS.EXPLORER_COLORBY_CATEGORY_HIGHLIGHT_HISTOGRAM);
}

export function trackColorByHistogramExpandCategory(
  isColorByHistogram: boolean,
  isAnyCategoryExpanded: boolean
): void {
  if (!isColorByHistogram || !isAnyCategoryExpanded) return;

  track(EVENTS.EXPLORER_COLORBY_HISTOGRAM_EXPAND_CATEGORY);
}

export function thunkTrackColorByHistogramExpandCategoryFromColorByHistogram() {
  return async (_: unknown, getState: GetState) => {
    const {
      colors: { colorMode },
      controls: { expandedCategories },
    } = getState();

    trackColorByHistogramExpandCategory(
      isColorByHistogramColorMode(colorMode),
      expandedCategories.length > 0
    );
  };
}

export function trackColorByHistogramHighlightHistogram(
  isColorByHistogram: boolean,
  isAnyHistogramHighlighted: boolean
): void {
  if (!isColorByHistogram || !isAnyHistogramHighlighted) return;

  track(EVENTS.EXPLORER_COLORBY_HISTOGRAM_HIGHLIGHT_HISTOGRAM);
}

export function thunkTrackColorByHistogramHighlightHistogramFromColorByHistogram() {
  return async (_: unknown, getState: GetState) => {
    const {
      colors: { colorMode },
      continuousSelection,
    } = getState();

    trackColorByHistogramHighlightHistogram(
      isColorByHistogramColorMode(colorMode),
      Object.keys(continuousSelection).length > 0
    );
  };
}

/**
 * (thuang): Amanda wants to treat both continuous metadata and gene expression
 * as color by histogram color mode in analytics events.
 */
export function isColorByHistogramColorMode(colorMode: string | null): boolean {
  return (
    colorMode === "color by continuous metadata" ||
    colorMode === "color by expression"
  );
}
