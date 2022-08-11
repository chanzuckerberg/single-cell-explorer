import React, { RefObject } from "react";
import Helmet from "react-helmet";
import { connect } from "react-redux";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { StylesProvider, ThemeProvider } from "@material-ui/core/styles";
import { theme } from "./theme";

import Controls from "./controls";
import DatasetSelector from "./datasetSelector/datasetSelector";
import Container from "./framework/container";
import Layout from "./framework/layout";
import LayoutSkeleton from "./framework/layoutSkeleton";
import LeftSideBar from "./leftSidebar";
import RightSideBar from "./rightSidebar";
import Legend from "./continuousLegend";
import Graph from "./graph/graph";
import MenuBar from "./menubar";
import Autosave from "./autosave";
import Header from "./NavBar";
import actions from "../actions";
import { RootState, AppDispatch } from "../reducers";

interface Props {
  dispatch: AppDispatch;
  loading: boolean;
  error: string;
  graphRenderCounter: number;
  tosURL: string | undefined;
  privacyURL: string | undefined;
}

class App extends React.Component<Props> {
  componentDidMount(): void {
    const { dispatch } = this.props;
    /* listen for url changes, fire one when we start the app up */
    window.addEventListener("popstate", this._onURLChanged);
    this._onURLChanged();
    dispatch(actions.doInitialDataLoad());
    dispatch(actions.checkExplainNewTab());
    this.forceUpdate();
  }

  _onURLChanged(): void {
    const { dispatch } = this.props;
    dispatch({ type: "url changed", url: document.location.href });
  }

  render(): JSX.Element {
    const { loading, error, graphRenderCounter, tosURL, privacyURL } =
      this.props;

    return (
      <Container>
        <StylesProvider injectFirst>
          <EmotionThemeProvider theme={theme}>
            <ThemeProvider theme={theme}>
              <Helmet title="CELL&times;GENE | Explorer" />
              {loading ? <LayoutSkeleton /> : null}
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
              <Header tosURL={tosURL} privacyURL={privacyURL} />
              {loading || error ? null : (
                <Layout>
                  <LeftSideBar />
                  {(viewportRef: RefObject<HTMLDivElement>) => (
                    <>
                      <Controls>
                        <DatasetSelector />
                        <MenuBar />
                      </Controls>
                      <Autosave />
                      <Legend />
                      <Graph
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- FIXME: added to solve linting error with ts-ignore
                        // @ts-ignore FIXME: Type '{ key: any; viewportRef: any; }' is not assi... Remove this comment to see the full error message
                        viewportRef={viewportRef}
                        key={graphRenderCounter}
                      />
                    </>
                  )}
                  <RightSideBar />
                </Layout>
              )}
            </ThemeProvider>
          </EmotionThemeProvider>
        </StylesProvider>
      </Container>
    );
  }
}

export default connect((state: RootState) => ({
  loading: state.controls.loading,
  error: state.controls.error,
  graphRenderCounter: state.controls.graphRenderCounter,
  tosURL: state.config?.parameters?.about_legal_tos,
  privacyURL: state.config?.parameters?.about_legal_privacy,
}))(App);
