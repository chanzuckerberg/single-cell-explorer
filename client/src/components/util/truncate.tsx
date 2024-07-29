import React, { CSSProperties, cloneElement } from "react";
import { Tooltip2 } from "@blueprintjs/popover2";

import { tooltipHoverOpenDelayQuick } from "../../globals";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";

const SPLIT_STYLE = {
  display: "flex",
  overflow: "hidden",
  justifyContent: "flex-start",
  width: "100%", // There are probably additional styles that we don't want to stack
  padding: 0,
};

const FIRST_HALF_STYLE = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flexShrink: 1,
  minWidth: "5px",
} as CSSProperties;

const SECOND_HALF_STYLE = {
  position: "relative",
  overflow: "hidden",
  whiteSpace: "nowrap",
};

const SECOND_HALF_SPACING_STYLE = {
  color: "transparent",
};

const SECOND_HALF_INNER_STYLE = {
  position: "absolute",
  right: 0,
};

const isTest = getFeatureFlag(FEATURES.TEST);

/**
 * (thuang): Make sure to add `max-width` to the first child element of this component
 * for truncation to work properly.
 * E.g.,
 * <Truncate>
 *  <span style={{ maxWidth: "100px" }}>This is a long string</span>
 * </Truncate>
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export default (props: any) => {
  const { children, isGenesetDescription, tooltipAddendum = "" } = props;
  // Truncate only support a single child with a text child

  if (
    React.Children.count(children) !== 1 ||
    React.Children.count(children.props?.children) !== 1
  ) {
    throw Error("Only pass a single child with text to Truncate");
  }
  const originalString = String(children.props.children);

  let firstString;
  let secondString;

  if (originalString.length === 1) {
    firstString = originalString;
  } else {
    firstString = originalString.substr(0, originalString.length / 2);
    secondString = originalString.substr(originalString.length / 2);
    if (firstString.charAt(firstString.length - 1) === " ") {
      firstString = `${firstString.substr(0, firstString.length - 1)}\u00a0`;
    }
    if (secondString.charAt(0) === " ") {
      secondString = `\u00a0${secondString.substr(1)}`;
    }
  }

  const inheritedColor = children.props.style?.color;

  const splitStyle = { ...children.props.style, ...SPLIT_STYLE };
  const secondHalfContentStyle = {
    ...SECOND_HALF_INNER_STYLE,
    color: inheritedColor || "inherit",
  };

  const truncatedJSX = (
    <span style={splitStyle}>
      <span style={FIRST_HALF_STYLE}>{firstString}</span>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ position: string; overflow: string; whiteS... Remove this comment to see the full error message */}
      <span style={SECOND_HALF_STYLE}>
        <span style={SECOND_HALF_SPACING_STYLE}>{secondString}</span>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ color: any; position: string; right: numbe... Remove this comment to see the full error message */}
        <span style={secondHalfContentStyle}>{secondString}</span>
      </span>
    </span>
  );

  // clone children, changing the children(text) to the truncated string
  const newChildren = React.Children.map(children, (child) =>
    cloneElement(child, {
      children: truncatedJSX,
      "aria-label": originalString,
    })
  );
  // we need an ID to check for this content, since this is the only place the geneset description appears
  const descriptionContent = (
    <span
      data-testid={`geneset-description-tooltip-${originalString}${tooltipAddendum}`}
    >
      {originalString}
      {tooltipAddendum}
    </span>
  );

  const originalContent = (
    <span>
      {originalString}
      {tooltipAddendum}
    </span>
  );

  return (
    <Tooltip2
      /**
       * We disable the tooltip in test mode, so we don't have flaky chromatic screenshots
       */
      disabled={isTest}
      content={isGenesetDescription ? descriptionContent : originalContent}
      hoverOpenDelay={tooltipHoverOpenDelayQuick}
      // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
      targetProps={{ style: children.props.style }}
    >
      {newChildren}
    </Tooltip2>
  );
};
