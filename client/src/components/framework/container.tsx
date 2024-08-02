import React from "react";
import { connect } from "react-redux";

import { RootState } from "../../reducers";

const mapStateToProps = (state: RootState) => ({
  showBottomBanner: state.showBottomBanner,
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
function Container(props: any) {
  const { children, showBottomBanner } = props;
  return (
    (showBottomBanner && (
      <div
        className="container"
        style={{
          height: "calc(100vh - 44px)", // 44px is the height of the bottom banner
          width: "100vw",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    )) || (
      <div
        className="container"
        style={{
          height: "calc(100vh - (100vh - 100%))",
          width: "calc(100vw - (100vw - 100%))",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    )
  );
}

export default connect(mapStateToProps)(Container);
