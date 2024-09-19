import React from "react";
import { connect } from "react-redux";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import actions from "actions";
import { RootState, AppDispatch } from "reducers";
import Controls from "common/components/Controls/Controls";
import { theme } from "util/theme";
import DatasetSelector from "../DatasetSelector/DatasetSelector";
import DiffexNotice from "../DiffexNotice/DiffexNotice";
import BottomBanner from "../BottomBanner/BottomBanner";
import Container from "../framework/container";
import Layout from "../framework/layout";
import LayoutSkeleton from "../framework/layoutSkeleton";
import LeftSideBar from "../leftSidebar";
import RightSideBar from "../rightSidebar";
import Legend from "../Legend/Legend";
import MenuBar from "../MenuBarTemp/MenuBar";
import NavBar from "../NavBar/NavBar";
import GlobalHotkeys from "../GlobalHotkeys/GlobalHotkeys";
import { selectIsSeamlessEnabled } from "../../selectors/datasetMetadata";
import Graph from "../Graph/Graph";
import Scatterplot from "../scatterplot/scatterplot";
import PanelEmbedding from "../PanelEmbedding/PanelEmbedding";
import { BANNER_FEEDBACK_SURVEY_LINK } from "../BottomBanner/constants";

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
  differentialExpressionLoading: RootState["differential"]["loading"];
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
  differentialExpressionLoading: state.differential.loading,
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
      differentialExpressionLoading,
      scatterplotXXaccessor,
      scatterplotYYaccessor,
    } = this.props;
    return (
      <Container>
        <StyledEngineProvider injectFirst>
          <EmotionThemeProvider theme={theme}>
            <ThemeProvider theme={theme}>
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
                <NavBar tosURL={tosURL} privacyURL={privacyURL} />
              )}
              {loading || error ? null : (
                <>
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
                  <BottomBanner surveyLink={BANNER_FEEDBACK_SURVEY_LINK} />
                </>
              )}
            </ThemeProvider>
          </EmotionThemeProvider>
          <DiffexNotice triggerOpen={differentialExpressionLoading} />
        </StyledEngineProvider>
      </Container>
    );
  }
}

export default connect(mapStateToProps)(App);
