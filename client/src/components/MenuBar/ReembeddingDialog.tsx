/**
 * ReembeddingDialog component
 * Converted from excellxgene/client/src/components/menubar/reembedding.js
 */

import React, { Component } from "react";
import { connect } from "react-redux";
import {
  AnchorButton,
  Tooltip,
  Dialog,
  ControlGroup,
  Button,
  InputGroup,
  FormGroup,
} from "@blueprintjs/core";

import * as globals from "../../globals";
import { requestReembed } from "../../actions/reembed";
import { RootState, AppDispatch } from "../../reducers";
import {
  ReembeddingParameters,
  ReembeddingController,
  PreprocessingController,
} from "../../common/types/reembed";

interface ReembeddingDialogState {
  setReembedDialogActive: boolean;
  embName: string;
}

interface AnnoMatrixLike {
  schema: { dataframe: { nObs: number } };
}

interface ObsCrossfilterLike {
  countSelected: () => number;
  annoMatrix: { nObs: number };
}

interface LayoutChoiceLike {
  current: string;
  available: string[];
}

interface ReembeddingDialogProps {
  reembedController: ReembeddingController;
  preprocessController: PreprocessingController;
  reembedParams: ReembeddingParameters;
  annoMatrix: AnnoMatrixLike; // minimal typing for linter
  idhash: string | null;
  obsCrossfilter: ObsCrossfilterLike; // minimal typing for linter
  layoutChoice: LayoutChoiceLike; // minimal typing for linter
  isSubsetted: boolean;
  userLoggedIn: boolean;
  hostedMode: boolean;
  selectedGenesLassoIndices: number[];
  dispatch: AppDispatch;
}

class ReembeddingDialog extends Component<
  ReembeddingDialogProps,
  ReembeddingDialogState
> {
  constructor(props: ReembeddingDialogProps) {
    super(props);
    this.state = {
      setReembedDialogActive: false,
      embName: "",
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


  handleRunAndDisableReembedDialog = async (): Promise<void> => {
    const {
      dispatch,
      reembedParams,
      layoutChoice,
      obsCrossfilter,
      isSubsetted,
      selectedGenesLassoIndices,
    } = this.props;
    const { embName } = this.state;

    // Validate embedding name
    if (!embName.trim()) {
      return; // Don't submit if no name provided
    }

    let parentName: string;

    if (
      obsCrossfilter.countSelected() === obsCrossfilter.annoMatrix.nObs &&
      isSubsetted
    ) {
      parentName = layoutChoice.current;
    } else if (
      obsCrossfilter.countSelected() === obsCrossfilter.annoMatrix.nObs
    ) {
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

    await dispatch(
      requestReembed(
        reembedParams,
        parentName,
        embName,
        selectedGenesLassoIndices
      )
    );
    this.setState({
      setReembedDialogActive: false,
      embName: "",
    });
  };

  onNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ embName: event.target.value });
  };

  render(): JSX.Element {
    const { setReembedDialogActive, embName } = this.state;
    const {
      reembedController,
      annoMatrix,
      obsCrossfilter,
      preprocessController,
      hostedMode,
    } = this.props;

    const cOrG = "cell"; // Always in cell mode
    const loading =
      !!reembedController?.pendingFetch || !!preprocessController?.pendingFetch;
    const tipContent =
      "Click to create a child embedding from the currently selected cells.";
    const cS = obsCrossfilter.countSelected();

    const runDisabled = cS > 50000 && hostedMode;

    const title = `Create Child Embedding on ${cS}/${annoMatrix.schema.dataframe.nObs} ${cOrG}s.`;

    return (
      <div>
        <Dialog
          icon="new-object"
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
                You cannot create child embeddings on greater than 50,000 cells.
              </AnchorButton>
            </div>
          ) : null}

          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <FormGroup label="Child Embedding Name" labelFor="embName">
              <InputGroup
                id="embName"
                value={embName}
                onChange={this.onNameChange}
                placeholder="Enter child embedding name..."
                fill
                autoFocus
              />
            </FormGroup>

            <ControlGroup fill vertical={false}>
              <Button onClick={this.handleDisableReembedDialog}>Cancel</Button>
              <Button
                disabled={!embName.trim() || runDisabled}
                onClick={this.handleRunAndDisableReembedDialog}
                intent="primary"
                loading={loading}
              >
                Create Child Embedding
              </Button>
            </ControlGroup>
          </div>
        </Dialog>

        <Tooltip
          content={tipContent}
          position="bottom"
          hoverOpenDelay={globals.tooltipHoverOpenDelay}
        >
          <AnchorButton
            icon="new-object"
            loading={loading}
            // disabled={!userLoggedIn}
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
  idhash:
    (state.config?.parameters?.["annotations-user-data-idhash"] as string) ??
    null,
  obsCrossfilter: state.obsCrossfilter,
  layoutChoice: state.layoutChoice,
  isSubsetted: false, // Property doesn't exist in current controls state
  userLoggedIn: false, // Property doesn't exist in current controls state
  hostedMode: false, // Property doesn't exist in current controls state
  selectedGenesLassoIndices: [], // Property doesn't exist in current genesets state
});

export default connect(mapStateToProps)(ReembeddingDialog);
