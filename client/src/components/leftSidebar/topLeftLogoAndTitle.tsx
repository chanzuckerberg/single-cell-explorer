/* Core dependencies */
import React from "react";
import { connect } from "react-redux";

/* App dependencies */
import Logo from "../framework/logo";
import Title from "../framework/title";
import * as globals from "../../globals";
import InformationMenu from "./infoMenu";

/* Styles */
export const topLeftLogoAndTileStyle: React.CSSProperties = {
  alignItems: "center",
  borderBottom: `1px solid ${globals.lighterGrey}`,
  display: "flex",
  justifyContent: "space-between",
  paddingLeft: 8,
  paddingTop: 8,
  width: globals.leftSidebarWidth,
  zIndex: 1,
};

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  tosURL: (state as any).config?.parameters?.about_legal_tos,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  privacyURL: (state as any).config?.parameters?.about_legal_privacy,
}))
class LeftSideBar extends React.Component {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleClick = () => {
    // Dataset drawer temporarily disabled (#30).
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch } = this.props;
    dispatch({ type: "toggle dataset drawer" });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    const {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'privacyURL' does not exist on type 'Read... Remove this comment to see the full error message
      privacyURL,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'tosURL' does not exist on type 'Readonly... Remove this comment to see the full error message
      tosURL,
    } = this.props;

    return (
      <div style={topLeftLogoAndTileStyle}>
        <div data-testid="header">
          <Logo size={28} />
          <Title />
        </div>
        <div style={{ marginRight: 5, height: "100%" }}>
          <InformationMenu
            {...{
              tosURL,
              privacyURL,
            }}
          />
        </div>
      </div>
    );
  }
}

export default LeftSideBar;
