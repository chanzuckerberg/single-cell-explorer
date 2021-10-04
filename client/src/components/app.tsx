import React, { RefObject } from "react";
import Helmet from "react-helmet";
import { connect } from "react-redux";

import Container from "./framework/container";
import Layout from "./framework/layout";
import LeftSideBar from "./leftSidebar";
import RightSideBar from "./rightSidebar";
import Legend from "./continuousLegend";
import Graph from "./graph/graph";
import MenuBar from "./menubar";
import Autosave from "./autosave";
import Embedding from "./embedding";

import actions from "../actions";
import { RootState, AppDispatch } from "../reducers";

interface Props {
  dispatch: AppDispatch;
  loading: boolean;
  error: string;
  graphRenderCounter: number;
}

class App extends React.Component<Props> {
  componentDidMount(): void {
    const { dispatch } = this.props;
    /* listen for url changes, fire one when we start the app up */
    window.addEventListener("popstate", this._onURLChanged);
    this._onURLChanged();
    dispatch(actions.doInitialDataLoad());
    this.forceUpdate();
  }

  _onURLChanged(): void {
    const { dispatch } = this.props;
    dispatch({ type: "url changed", url: document.location.href });
  }

  render(): JSX.Element {
    const { loading, error, graphRenderCounter } = this.props;

    return (
      <Container>
        <Helmet title="cellxgene" />
        {loading ? (
          <div
            style={{
              position: "fixed",
              fontWeight: 500,
              top: window.innerHeight / 2,
              left: window.innerWidth / 2 - 50,
            }}
          >
            loading cellxgene
          </div>
        ) : null}
        {error ? (
          <div
            style={{
              position: "fixed",
              fontWeight: 500,
              top: window.innerHeight / 2,
              left: window.innerWidth / 2 - 50,
            }}
          >
            error loading cellxgene
          </div>
        ) : null}
        {loading || error ? null : (
          <Layout>
            <LeftSideBar />
            {(viewportRef: RefObject<HTMLDivElement>) => (
              <>
                <MenuBar />
                <Embedding />
                <Autosave />
                <Legend />
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ key: any; viewportRef: any; }' is not assi... Remove this comment to see the full error message */}
                <Graph key={graphRenderCounter} viewportRef={viewportRef} />
              </>
            )}
            <RightSideBar />
          </Layout>
        )}
      </Container>
    );
  }
}

export default connect((state: RootState) => ({
  loading: state.controls.loading,
  error: state.controls.error,
  graphRenderCounter: state.controls.graphRenderCounter,
}))(App);
