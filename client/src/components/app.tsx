import React from "react";
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
import MenuBar from "./menubar";
import Header from "./NavBar";
import actions from "../actions";
import { RootState, AppDispatch } from "../reducers";
import GlobalHotkeys from "./hotkeys";
import { selectIsSeamlessEnabled } from "../selectors/datasetMetadata";
import Graph from "./graph/graph";
import GeneInfo from "./geneExpression/geneInfo/geneInfo";
import Scatterplot from "./scatterplot/scatterplot";
import PanelEmbedding from "./PanelEmbedding";

interface StateProps {
  loading: RootState["controls"]["loading"];
  error: RootState["controls"]["error"];
  graphRenderCounter: number;
  tosURL: string | undefined;
  privacyURL: string;
  seamlessEnabled: boolean;
  datasetMetadataError: RootState["datasetMetadata"]["error"];
  isCellGuideCxg: RootState["controls"]["isCellGuideCxg"];
  scatterplotXXaccessor: RootState["controls"]["scatterplotXXaccessor"];
  scatterplotYYaccessor: RootState["controls"]["scatterplotYYaccessor"];
  geneIsOpen: boolean;
}

const mapStateToProps = (state: RootState): StateProps => ({
  loading: state.controls.loading,
  error: state.controls.error,
  graphRenderCounter: state.controls.graphRenderCounter,
  tosURL: state.config?.parameters?.about_legal_tos,
  privacyURL: state.config?.parameters?.about_legal_privacy || "",
  seamlessEnabled: selectIsSeamlessEnabled(state),
  datasetMetadataError: state.datasetMetadata.error,
  isCellGuideCxg: state.controls.isCellGuideCxg,
  scatterplotXXaccessor: state.controls.scatterplotXXaccessor,
  scatterplotYYaccessor: state.controls.scatterplotYYaccessor,
  geneIsOpen: state.controls.geneIsOpen,
});

class App extends React.Component<StateProps & { dispatch: AppDispatch }> {
  componentDidMount(): void {
    const { dispatch } = this.props;
    dispatch(actions.doInitialDataLoad());
    dispatch(actions.checkExplainNewTab());
    this.forceUpdate();
  }

  render(): JSX.Element {
    const {
      loading,
      error,
      graphRenderCounter,
      tosURL,
      privacyURL,
      seamlessEnabled,
      datasetMetadataError,
      isCellGuideCxg,
      scatterplotXXaccessor,
      scatterplotYYaccessor,
      geneIsOpen,
    } = this.props;
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
              {(seamlessEnabled ||
                datasetMetadataError === null ||
                isCellGuideCxg) && (
                <Header tosURL={tosURL} privacyURL={privacyURL} />
              )}
              {loading || error ? null : (
                <Layout
                  addTopPadding={!datasetMetadataError || isCellGuideCxg}
                  renderGraph={(viewportRef: HTMLDivElement) => (
                    <>
                      <GlobalHotkeys />
                      <Controls>
                        <MenuBar />
                      </Controls>
                      <Legend />
                      <Graph
                        viewportRef={viewportRef}
                        key={graphRenderCounter}
                      />
                      {scatterplotXXaccessor && scatterplotYYaccessor && (
                        <Scatterplot />
                      )}

                      {geneIsOpen && (
                        <GeneInfo
                          geneSummary=""
                          geneName=""
                          gene=""
                          geneUrl=""
                          geneSynonyms={[]}
                          showWarningBanner
                        />
                      )}
                      <PanelEmbedding />
                      <Controls bottom={0}>
                        <DatasetSelector />
                      </Controls>
                    </>
                  )}
                >
                  <LeftSideBar />
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

export default connect(mapStateToProps)(App);
