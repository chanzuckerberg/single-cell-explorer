/**
 * ReembeddingDialog component
 * Converted from excellxgene/client/src/components/menubar/reembedding.js
 */

import React, { Component } from "react";
import { connect } from "react-redux";
import {
  AnchorButton,
  ButtonGroup,
  Tooltip,
  Dialog,
  ControlGroup,
  Button,
} from "@blueprintjs/core";

import * as globals from "../../globals";
import { requestReembed, requestPreprocessing } from "../../actions/reembed";
import { RootState, AppDispatch } from "../../reducers";
import {
  ReembeddingParameters,
  ReembeddingController,
  PreprocessingController,
} from "../../common/types/reembed";
import { PreprocessingPanel } from "./PreprocessingPanel";
import { DimensionalityReductionPanel } from "./DimensionalityReductionPanel";
import { DefaultsIO } from "./DefaultsIO";

interface ReembeddingDialogState {
  setReembedDialogActive: boolean;
  embName: string;
  reembeddingPanel: boolean;
}

interface ReembeddingDialogProps {
  reembedController: ReembeddingController;
  preprocessController: PreprocessingController;
  reembedParams: ReembeddingParameters;
  annoMatrix: any; // TODO: Type this properly
  idhash: string | null;
  obsCrossfilter: any; // TODO: Type this properly
  layoutChoice: any; // TODO: Type this properly
  isSubsetted: boolean;
  userLoggedIn: boolean;
  hostedMode: boolean;
  cxgMode: string;
  selectedGenesLassoIndices: number[];
  dispatch: AppDispatch;
}

class ReembeddingDialog extends Component<ReembeddingDialogProps, ReembeddingDialogState> {
  constructor(props: ReembeddingDialogProps) {
    super(props);
    this.state = {
      setReembedDialogActive: false,
      embName: "",
      reembeddingPanel: false,
    };
  }

  handleEnableReembedDialog = (): void => {
    this.setState({ setReembedDialogActive: true });
  };

  handleDisableReembedDialog = (): void => {
    this.setState({
      setReembedDialogActive: false,
    });
  };

  handleRunAndDisablePreprocessingDialog = (): void => {
    const { dispatch, reembedParams } = this.props;
    
    dispatch(requestPreprocessing(reembedParams));
    this.setState({
      setReembedDialogActive: false,
    });
  };

  handleRunAndDisableReembedDialog = (): void => {
    const {
      dispatch,
      reembedParams,
      layoutChoice,
      obsCrossfilter,
      isSubsetted,
      selectedGenesLassoIndices,
    } = this.props;
    const { embName } = this.state;
    
    let parentName: string;

    if (obsCrossfilter.countSelected() === obsCrossfilter.annoMatrix.nObs && isSubsetted) {
      parentName = layoutChoice.current;
    } else if (obsCrossfilter.countSelected() === obsCrossfilter.annoMatrix.nObs) {
      if (layoutChoice.current.includes(";;")) {
        const parentParts = layoutChoice.current.split(";;");
        parentParts.pop();
        parentName = parentParts.join(";;");
        if (!layoutChoice.available.includes(parentName)) {
          parentName = "";
        }
      } else {
        parentName = "";
      }
    } else {
      parentName = layoutChoice.current;
    }

    dispatch(requestReembed(reembedParams, parentName, embName, selectedGenesLassoIndices));
    this.setState({
      setReembedDialogActive: false,
      embName: "",
    });
  };

  onNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ embName: event.target.value });
  };

  render(): JSX.Element {
    const { setReembedDialogActive, embName, reembeddingPanel } = this.state;
    const {
      dispatch,
      cxgMode,
      reembedController,
      idhash,
      annoMatrix,
      obsCrossfilter,
      preprocessController,
      reembedParams,
      userLoggedIn,
      hostedMode,
    } = this.props;

    const cOrG = cxgMode === "OBS" ? "cell" : "gene";
    const loading = !!reembedController?.pendingFetch || !!preprocessController?.pendingFetch;
    const tipContent = "Click to perform preprocessing and dimensionality reduction on the currently selected cells.";
    const cS = obsCrossfilter.countSelected();
    
    const runDisabled = cS > 50000 && hostedMode;
    
    const title = `${reembeddingPanel ? "Reembedding" : "Preprocessing"} on ${cS}/${annoMatrix.schema.dataframe.nObs} ${cOrG}s.`;

    return (
      <div>
        <Dialog
          icon="info-sign"
          onClose={this.handleDisableReembedDialog}
          title={title}
          autoFocus
          canEscapeKeyClose
          canOutsideClickClose
          enforceFocus
          isOpen={setReembedDialogActive}
          usePortal
        >
          {runDisabled ? (
            <div style={{ paddingBottom: "20px" }}>
              <AnchorButton fill minimal icon="warning-sign" intent="danger">
                You cannot preprocess or reembed on greater than 50,000 cells.
              </AnchorButton>
            </div>
          ) : null}

          <DefaultsIO dispatch={dispatch} />

          <ControlGroup fill={true} vertical={false}>
            <AnchorButton
              onClick={() => {
                this.setState({ ...this.state, reembeddingPanel: false });
              }}
              text="Preprocessing"
              intent={!reembeddingPanel ? "primary" : undefined}
            />
            <AnchorButton
              onClick={() => {
                this.setState({ ...this.state, reembeddingPanel: true });
              }}
              text="Reembedding"
              intent={reembeddingPanel ? "primary" : undefined}
            />
          </ControlGroup>

          {!reembeddingPanel ? (
            <div
              style={{
                paddingTop: "20px",
                marginLeft: "10px",
                marginRight: "10px",
              }}
            >
              <PreprocessingPanel idhash={idhash} />
              <ControlGroup style={{ paddingTop: "15px" }} fill={true} vertical={false}>
                <Button onClick={this.handleDisableReembedDialog}>Close</Button>
                <Button
                  onClick={() => {
                    this.setState({ ...this.state, reembeddingPanel: true });
                  }}
                >
                  Next
                </Button>
              </ControlGroup>
            </div>
          ) : (
            <div
              style={{
                paddingTop: "20px",
                marginLeft: "10px",
                marginRight: "10px",
              }}
            >
              <DimensionalityReductionPanel
                embName={embName}
                onChange={this.onNameChange}
                idhash={idhash}
              />
              <ControlGroup style={{ paddingTop: "15px" }} fill={true} vertical={false}>
                <Button onClick={this.handleDisableReembedDialog}>Close</Button>
                <Button
                  disabled={
                    (reembedParams.doBatch && reembedParams.batchKey === "") ||
                    (reembedParams.doBatchPrep &&
                      (reembedParams.batchPrepKey === "" || reembedParams.batchPrepLabel === "")) ||
                    runDisabled ||
                    (reembedParams.embeddingMode === "Run UMAP" && reembedParams.latentSpace === "")
                  }
                  onClick={this.handleRunAndDisableReembedDialog}
                  intent="primary"
                >
                  {reembedParams.embeddingMode}
                </Button>
              </ControlGroup>
            </div>
          )}
        </Dialog>

        <Tooltip
          content={tipContent}
          position="bottom"
          hoverOpenDelay={globals.tooltipHoverOpenDelay}
        >
          <AnchorButton
            icon="new-object"
            loading={loading}
            disabled={!userLoggedIn}
            onClick={this.handleEnableReembedDialog}
            data-testid="reembedding-options"
          />
        </Tooltip>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  reembedController: state.reembedController,
  preprocessController: state.preprocessController,
  reembedParams: state.reembedParameters,
  annoMatrix: state.annoMatrix,
  idhash: state.config?.parameters?.["annotations-user-data-idhash"] ?? null,
  obsCrossfilter: state.obsCrossfilter,
  layoutChoice: state.layoutChoice,
  isSubsetted: state.controls.isSubsetted,
  userLoggedIn: !!state.controls.userInfo,
  hostedMode: state.controls.hostedMode,
  cxgMode: state.controls.cxgMode,
  selectedGenesLassoIndices: state.genesets.selectedGenesLassoIndices,
});

export default connect(mapStateToProps)(ReembeddingDialog);