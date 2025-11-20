import React from "react";
import { connect } from "react-redux";
import { Helmet, HelmetData } from "react-helmet-async";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { ChromatinViewerProvider } from "common/hooks/useChromatinViewerSelectedGene";
import actions from "actions";
import { RootState, AppDispatch } from "reducers";
import Controls from "common/components/Controls/Controls";
import { theme } from "util/theme";
import DatasetSelector from "../DatasetSelector/DatasetSelector";
import DiffexNotice from "../DiffexNotice/DiffexNotice";
import Container from "../framework/container";
import Layout from "../framework/layout";
import { LayoutSkeleton } from "../framework/LayoutSkeleton/LayoutSkeleton";
import LeftSideBar from "../LeftSidebar/LeftSidebar";
import RightSideBar from "../RightSideBar/RightSideBar";
import Legend from "../Legend/Legend";
import MenuBar from "../MenuBar/MenuBar";
import NavBar from "../NavBar/NavBar";
import GlobalHotkeys from "../GlobalHotkeys/GlobalHotkeys";
import { selectIsSeamlessEnabled } from "../../selectors/datasetMetadata";
import Graph from "../Graph/Graph";
import Scatterplot from "../scatterplot/scatterplot";
import PanelEmbedding from "../PanelEmbedding/PanelEmbedding";
import BottomPanel from "../BottomPanel/BottomPanel";
import Autosave from "../Autosave";
import BYODToast from "../BYODConnectors/BYODToast";

interface StateProps {
  loading: RootState["controls"]["loading"];
  error: RootState["controls"]["error"];
  graphRenderCounter: number;
  tosURL: string | undefined;
  privacyURL: string;
  seamlessEnabled: boolean;
  datasetMetadataError: RootState["datasetMetadata"]["error"];
  datasetMetadata: RootState["datasetMetadata"];
  isCellGuideCxg: RootState["controls"]["isCellGuideCxg"];
  scatterplotXXaccessor: RootState["controls"]["scatterplotXXaccessor"];
  scatterplotYYaccessor: RootState["controls"]["scatterplotYYaccessor"];
  differentialExpressionLoading: RootState["differential"]["loading"];
  bottomPanelSelectedGene: RootState["controls"]["bottomPanelSelectedGene"];
}

const mapStateToProps = (state: RootState): StateProps => ({
  loading: state.controls.loading,
  error: state.controls.error,
  graphRenderCounter: state.controls.graphRenderCounter,
  tosURL: state.config?.parameters?.about_legal_tos,
  privacyURL: state.config?.parameters?.about_legal_privacy || "",
  seamlessEnabled: selectIsSeamlessEnabled(state),
  datasetMetadataError: state.datasetMetadata.error,
  datasetMetadata: state.datasetMetadata,
  isCellGuideCxg: state.controls.isCellGuideCxg,
  scatterplotXXaccessor: state.controls.scatterplotXXaccessor,
  scatterplotYYaccessor: state.controls.scatterplotYYaccessor,
  differentialExpressionLoading: state.differential.loading,
  bottomPanelSelectedGene: state.controls.bottomPanelSelectedGene,
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
      datasetMetadata,
      isCellGuideCxg,
      differentialExpressionLoading,
      scatterplotXXaccessor,
      scatterplotYYaccessor,
      bottomPanelSelectedGene,
    } = this.props;

    const isPublished =
      datasetMetadata?.datasetMetadata?.collection_datasets[0]?.published;
    const helmetData = new HelmetData({});

    return (
      <Container>
        <Helmet helmetData={helmetData} prioritizeSeoTags>
          {!isPublished && <meta name="robots" content="noindex" />}
        </Helmet>
        <StyledEngineProvider injectFirst>
          <EmotionThemeProvider theme={theme}>
            <ThemeProvider theme={theme}>
              <ChromatinViewerProvider
                initialSelectedGene={bottomPanelSelectedGene}
              >
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
                  isCellGuideCxg) &&
                  process.env.DEPLOYMENT_TYPE !== "vcp-hosted" && (
                    <NavBar tosURL={tosURL} privacyURL={privacyURL} />
                  )}
                {loading || error ? null : (
                  <>
                    <Layout
                      addTopPadding={!datasetMetadataError || isCellGuideCxg}
                      renderGraph={(viewportRef: HTMLDivElement) => (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                          }}
                        >
                          <GlobalHotkeys />
                          <Controls>
                            <MenuBar />
                          </Controls>
                          <Legend />
                          <div
                            style={{
                              flex: 1,
                              position: "relative",
                            }}
                          >
                            <Graph
                              viewportRef={viewportRef}
                              key={graphRenderCounter}
                            />
                            {scatterplotXXaccessor && scatterplotYYaccessor && (
                              <Scatterplot />
                            )}
                            <PanelEmbedding />
                            <Autosave />
                          </div>
                          <Controls bottom={0}>
                            <DatasetSelector />
                          </Controls>
                        </div>
                      )}
                    >
                      <LeftSideBar />
                      <RightSideBar />
                      <BottomPanel />
                      {process.env.DEPLOYMENT_TYPE !== "vcp-hosted" && (
                        <BYODToast />
                      )}
                    </Layout>
                  </>
                )}
              </ChromatinViewerProvider>
            </ThemeProvider>
          </EmotionThemeProvider>
          <DiffexNotice triggerOpen={differentialExpressionLoading} />
        </StyledEngineProvider>
      </Container>
    );
  }
}

export default connect(mapStateToProps)(App);
