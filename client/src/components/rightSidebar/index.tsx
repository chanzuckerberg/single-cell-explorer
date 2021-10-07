/* Core dependencies */
import React, { CSSProperties } from "react";
import { connect } from "react-redux";

/* App dependencies */
import GeneExpression from "../geneExpression";
import * as globals from "../../globals";

/* Styles */
export const STYLE_RIGHT_SIDEBAR: CSSProperties = {
  /* x y blur spread color */
  borderLeft: `1px solid ${globals.lightGrey}`,
  display: "flex",
  flexDirection: "column",
  height: "inherit",
  overflowY: "inherit",
  padding: globals.leftSidebarSectionPadding,
  position: "relative",
  width: "inherit",
};

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  scatterplotXXaccessor: (state as any).controls.scatterplotXXaccessor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  scatterplotYYaccessor: (state as any).controls.scatterplotYYaccessor,
}))
class RightSidebar extends React.Component {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    return (
      <div style={STYLE_RIGHT_SIDEBAR}>
        <GeneExpression />
      </div>
    );
  }
}

export default RightSidebar;
