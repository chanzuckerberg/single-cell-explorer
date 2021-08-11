/* Core dependencies */
import {
  BreadcrumbProps,
  Classes,
  MenuItemProps,
  ResizeSensor,
} from "@blueprintjs/core";
import React, { useEffect, useState } from "react";
import { ResizeEntry } from "@blueprintjs/core/src/components/resize-sensor/resizeObserverTypes";

interface Props {
  breadcrumbRenderer: (item: TruncatingBreadcrumbProps) => JSX.Element;
  currentBreadcrumbRenderer: (
    item: TruncatingBreadcrumbMenuProps
  ) => JSX.Element;
  items: TruncatingBreadcrumbProps[];
}

/*
 Internal representation of breadcrumb props, with additional config to help calculate truncated state, if any.
 */
interface BreadcrumbConfig {
  displayText: string;
  hidden: boolean;
  item: TruncatingBreadcrumbProps;
  minTextWidth: number;
  shortTextWidth: number;
  textWidth: number;
}

/*
 Menu items listed in truncating breadcrumbs dataset menu breadcrumb.
 */
export interface TruncatingBreadcrumbMenuItemProps extends MenuItemProps {
  key: string;
}

/*
 Props for modeling "current" breadcrumb with menu.
 */
export interface TruncatingBreadcrumbMenuProps
  extends TruncatingBreadcrumbProps {
  items: TruncatingBreadcrumbMenuItemProps[];
}

/*
 Standard breadcrumb link. 
 */
export interface TruncatingBreadcrumbProps extends BreadcrumbProps {
  key: string;
  shortText: string;
}

// Characters to be used to indicate display text has been truncated
const CHAR_ELLIPSIS = "...";

// Minimum number of characters to be displayed before transitioning to a smaller state of the breadcrumbs
const MIN_VISIBLE_CHARS = 11;

// Approximate padding in pixels for each breadcrumb.
const ITEM_PADDING = 26;

// Approximate pixel to character ratio
const PIXELS_PER_CHAR = 6;

/*
 Individual Breadcrumb States
 ----------------------------
 F - full text
 T - truncated text
 S - indicates use of short text (eg "Collection" for collection name or "Dataset" for dataset name)
 H - hidden
 */
enum BreadcrumbState {
  "FULL" = "F", // eg "Tabula Muris Senis"
  "TRUNCATED" = "T", // eg "Tabula...Senis"
  "SHORT_TEXT" = "S", // eg "Collection"
  "HIDDEN" = "H", // --
}

/*
 Breadcrumbs State
 -----------------
 FFF - full, full, full
 FTF - full, truncated, full
 HSF - hidden, short text, full
 HST - hidden, short text, truncated
 HHS - hidden, hidden, short text
 */
type BreadcrumbsState = BreadcrumbState[];
const STATES_FFF: BreadcrumbsState = [
  BreadcrumbState.FULL,
  BreadcrumbState.FULL,
  BreadcrumbState.FULL,
];
const STATES_FTF: BreadcrumbsState = [
  BreadcrumbState.FULL,
  BreadcrumbState.TRUNCATED,
  BreadcrumbState.FULL,
];
const STATES_HSF: BreadcrumbsState = [
  BreadcrumbState.HIDDEN,
  BreadcrumbState.SHORT_TEXT,
  BreadcrumbState.FULL,
];
const STATES_HST: BreadcrumbsState = [
  BreadcrumbState.HIDDEN,
  BreadcrumbState.SHORT_TEXT,
  BreadcrumbState.TRUNCATED,
];
const STATES_HHS: BreadcrumbsState = [
  BreadcrumbState.HIDDEN,
  BreadcrumbState.HIDDEN,
  BreadcrumbState.SHORT_TEXT,
];

/*
 Breadcrumb Transitions
 ----------------------
 Breadcrumbs can transition bidirectionally through states in the following order, and can also repeat individual states.
 */
const BreadcrumbsStateTransitions: BreadcrumbsState[] = [
  STATES_FFF,
  STATES_FTF,
  STATES_HSF,
  STATES_HST,
  STATES_HHS,
];

/*
 Calculate the total width required to display the given items with the given states.
 @param breadcrumbsState - State of each breadcrumb that width required to display is being calculated for. For 
 example, [F, F, F].
 @param configs - Set of config objects backing each breadcrumb.
 @returns Number presenting the total number of pixels required to display the items in their current states.
 */
const calculateRequiredWidth = (
  breadcrumbsState: Partial<BreadcrumbsState>,
  configs: BreadcrumbConfig[]
): number =>
  configs.reduce((accum: number, config: BreadcrumbConfig, i: number) => {
    // Grab the state for this breadcrumb. For example, given the state HTF, the state of the first item is H, the state
    // of the second item is T and the state of the third item is F.
    const itemState = breadcrumbsState[i];
    if (!itemState) {
      return accum;
    }
    // Add the width (of text) corresponding to the item's state.
    if (isStateShortText(itemState)) {
      accum += config.shortTextWidth;
    } else if (isStateTruncated(itemState)) {
      accum += config.minTextWidth;
    } else if (isStateFull(itemState)) {
      accum += config.textWidth;
    }
    return accum;
  }, 0);

/*
 Return the width that the truncated item has available for display. That is, the available width minus the widths
 required by the other, non-truncated, items. 
 @param configs - Set of config objects backing each breadcrumb.
 @param truncatedIndex - Index of breadcrumb currently being truncated.
 @param breadcrumbsState - State of each breadcrumb. For example, [F, F, F].
 @param availableWidth - Full width available to breadcrumbs. 
 @returns Width that truncated breadcrumb has available for display.
 */
const calculateAvailableTruncatedWidth = (
  configs: BreadcrumbConfig[],
  truncatedIndex: number,
  breadcrumbsState: BreadcrumbsState,
  availableWidth: number
): number => {
  // Grab the items other than the truncated item.
  const otherItems = [...configs];
  otherItems.splice(truncatedIndex, 1);

  // Grab the states of the the items, other than the truncated item.
  const otherItemsState = [...breadcrumbsState];
  otherItemsState.splice(truncatedIndex, 1);

  // Calculate the width of the other items in their corresponding states.
  const otherItemsRequiredWidth = calculateRequiredWidth(
    otherItemsState,
    otherItems
  );

  return availableWidth - otherItemsRequiredWidth;
};

/*
 Determine the current items state (eg FFF, FTF etc) for the given available width and set of items.
 @param configs - Set of config objects backing each breadcrumb.
 @param availableWidth - Full width available to breadcrumbs. 
 @returns The ideal state for each breadcrumb given the width available. For example, [F, F, F].
 */
const getBreadcrumbsStateForAvailableWidth = (
  configs: BreadcrumbConfig[],
  availableWidth: number
): BreadcrumbsState => {
  for (let i = 0; i < BreadcrumbsStateTransitions.length; i += 1) {
    const itemsState = BreadcrumbsStateTransitions[i];
    const requiredWidth = calculateRequiredWidth(itemsState, configs);
    if (availableWidth >= requiredWidth) {
      return itemsState;
    }
  }
  return BreadcrumbsStateTransitions[BreadcrumbsStateTransitions.length - 1]; // There's a problem, default to smallest state.
};

/*
  Build initial state of items, including the calculation of short text, truncated text and full text dimensions. Use
  approximation of six pixels per char.
  @param rawItems - Set of breadcrumb props passed in via props.
  @returns Internal representation of breadcrumb props facilitating truncating behavior and rendering.
 */
const initItems = (rawItems: TruncatingBreadcrumbProps[]): BreadcrumbConfig[] =>
  rawItems.map((rawItem: TruncatingBreadcrumbProps) => ({
    hidden: false,
    item: rawItem,
    displayText: rawItem.text as string, // Default display to full breadcrumb text
    minTextWidth: MIN_VISIBLE_CHARS * PIXELS_PER_CHAR + ITEM_PADDING,
    shortTextWidth: rawItem.shortText.length * PIXELS_PER_CHAR + ITEM_PADDING,
    textWidth: (rawItem.text as string).length * PIXELS_PER_CHAR + ITEM_PADDING,
  }));

/*
 Returns true if state is full.
 @param state - Name of state to check.
 @returns True if given state is full.  
 */
const isStateFull = (state: BreadcrumbState): boolean =>
  state === BreadcrumbState.FULL;

/*
 Returns true if state is hidden.
 @param state - Name of state to check.
 @returns True if given state is hidden.  
 */
const isStateHidden = (state: BreadcrumbState): boolean =>
  state === BreadcrumbState.HIDDEN;

/*
 Returns true if state is short text.
 @param state - Name of state to check.
 @returns True if given state is short text.  
 */
const isStateShortText = (state: BreadcrumbState): boolean =>
  state === BreadcrumbState.SHORT_TEXT;

/*
 Returns true if state is truncated.
 @param state - Name of state to check.
 @returns True if given state is truncated.  
 */
const isStateTruncated = (state: BreadcrumbState): boolean =>
  state === BreadcrumbState.TRUNCATED;

/*
 Resize the items, either the set of visible items, or the individual item display text, to fit the given available
 width.
 @param configs - Set of config objects backing each breadcrumb.
 @param availableWidth - Full width available to breadcrumbs. 
 @returns The state for each breadcrumb given the width available. For example, [F, F, F].
 */
const buildResizedItems = (
  configs: BreadcrumbConfig[],
  availableWidth: number
): BreadcrumbConfig[] => {
  const breadcrumbsState = getBreadcrumbsStateForAvailableWidth(
    configs,
    availableWidth
  );
  // TODO(cc) if same state as previous and state does not contain T (eg FFF or FSF or HHS) then don't recalc here
  return updateBreadcrumbConfigs(breadcrumbsState, configs, availableWidth);
};

/*
 Return truncated text with characters removed to reduce text width to the available width. 
 @param availableWidth - Full width available to breadcrumbs. 
 @param text - Text to truncate.
 @returns Text truncated to the point where it can fit within the given available width.
 */
const truncate = (availableWidth: number, text: string): string => {
  const visibleLength = Math.floor(availableWidth / PIXELS_PER_CHAR);
  // Determine the break indices for the "before" and "after" ellipsis text tokens
  const tokenBeforeEndIndex = Math.ceil(visibleLength / 2);
  const tokenAfterStartIndex = Math.floor(visibleLength / 2);
  // Split text at break indices and join with ellipsis
  const tokenBefore = text.substr(0, tokenBeforeEndIndex).trim();
  const tokenAfter = text.substr(text.length - tokenAfterStartIndex).trim();
  return `${tokenBefore}${CHAR_ELLIPSIS}${tokenAfter}`;
};

/*
 Update each breadcrumb to match its display format to the state being transitioned to.
 @param breadcrumbsState - State of each breadcrumb. For example, [F, F, F].
 @param configs - Set of config objects backing each breadcrumb.
 @param availableWidth - Full width available to breadcrumbs. 
 @returns Updated set of breadcrumb configs to match the new breadcrumbs state.
 */
const updateBreadcrumbConfigs = (
  breadcrumbsState: BreadcrumbsState,
  configs: BreadcrumbConfig[],
  availableWidth: number
): BreadcrumbConfig[] =>
  configs.map((config: BreadcrumbConfig, i: number) => {
    const itemState = breadcrumbsState[i];
    if (isStateHidden(itemState)) {
      return {
        ...config,
        hidden: true,
      };
    }
    if (isStateShortText(itemState)) {
      return {
        ...config,
        displayText: config.item.shortText,
        hidden: false,
      };
    }
    if (isStateTruncated(itemState)) {
      const truncatedAvailableWidth = calculateAvailableTruncatedWidth(
        configs,
        i,
        breadcrumbsState,
        availableWidth
      );
      return {
        ...config,
        displayText: truncate(
          truncatedAvailableWidth,
          config.item.text as string
        ),
        hidden: false,
      };
    }
    return {
      ...config,
      displayText: config.item.text as string,
      hidden: false,
    };
  });

const TruncatingBreadcrumbs = React.memo<Props>(
  ({ breadcrumbRenderer, currentBreadcrumbRenderer, items: rawItems }) => {
    const [items, setItems] = useState<BreadcrumbConfig[]>([]);

    /*
     On resize callback from ResizeSensor, save the current width of the breadcrumbs.
     @param entries - Array of elements being observed for resize events.
    */
    const onResize = (entries: ResizeEntry[]) => {
      const availableWidth = Math.floor(entries[0].contentRect.width);
      setItems(buildResizedItems(items, availableWidth));
    };

    /*
     Return list element/breadcrumb for each breadcrumb config. 
     @param configs - The set of config objects backing each breadcrumb.
    */
    const renderBreadcrumbs = (
      configs: BreadcrumbConfig[]
    ): (JSX.Element | null)[] =>
      configs.map((config: BreadcrumbConfig, i: number) => {
        if (config.hidden) {
          return null;
        }
        const currentItem = i === configs.length - 1;
        // Create new version of props with updated text for display.
        const props = {
          ...config.item,
          text: config.displayText,
        };
        return (
          <li key={config.item.key}>
            {currentItem
              ? currentBreadcrumbRenderer(
                  props as TruncatingBreadcrumbMenuProps
                )
              : breadcrumbRenderer(props)}
          </li>
        );
      });

    /*
     Init/update breadcrumb config from the set of raw breadcrumb props.
     */
    useEffect(() => {
      setItems(initItems(rawItems));
    }, [rawItems]);

    return (
      <ResizeSensor onResize={onResize}>
        <ul
          className={Classes.BREADCRUMBS}
          style={{
            display: "flex",
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
          }}
        >
          {renderBreadcrumbs(items)}
        </ul>
      </ResizeSensor>
    );
  }
);

export default TruncatingBreadcrumbs;
