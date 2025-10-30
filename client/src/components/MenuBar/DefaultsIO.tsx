/**
 * DefaultsIO component for parameter save/load
 * Converted from excellxgene/client/src/components/menubar/defaultsio.js
 */

import React, { Component } from "react";
import { connect } from "react-redux";
import {
  Button,
  ButtonGroup,
  FileInput,
  Intent,
  Tooltip,
} from "@blueprintjs/core";

import { RootState, AppDispatch } from "../../reducers";
import {
  loadReembeddingParameters,
  setReembeddingParameters,
} from "../../actions/reembed";
import {
  ReembeddingParameters,
  DefaultsIOProps,
  DEFAULT_REEMBEDDING_PARAMS,
} from "../../common/types/reembed";
import { postAsyncFailureToast, postAsyncSuccessToast } from "../framework/toasters";

interface DefaultsIOConnectedProps extends DefaultsIOProps {
  reembedParams: ReembeddingParameters;
}

class DefaultsIO extends Component<DefaultsIOConnectedProps> {
  private fileInputRef = React.createRef<HTMLInputElement>();

  handleSaveDefaults = (): void => {
    const { reembedParams } = this.props;
    
    try {
      const dataStr = JSON.stringify(reembedParams, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "reembedding_parameters.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      postAsyncSuccessToast("Parameters saved successfully");
    } catch (error) {
      console.error("Error saving parameters:", error);
      postAsyncFailureToast("Failed to save parameters");
    }
  };

  handleLoadDefaults = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { dispatch } = this.props;
    const file = event.target.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const params = JSON.parse(content) as ReembeddingParameters;
        
        // Validate that loaded params have expected structure
        if (typeof params === "object" && params !== null) {
          dispatch(loadReembeddingParameters(params));
          postAsyncSuccessToast("Parameters loaded successfully");
        } else {
          throw new Error("Invalid parameter file format");
        }
      } catch (error) {
        console.error("Error loading parameters:", error);
        postAsyncFailureToast("Failed to load parameters. Please check file format.");
      }
    };
    
    reader.readAsText(file);
    
    // Reset the input
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = "";
    }
  };

  handleResetToDefaults = (): void => {
    const { dispatch } = this.props;
    dispatch(setReembeddingParameters(DEFAULT_REEMBEDDING_PARAMS));
    postAsyncSuccessToast("Parameters reset to defaults");
  };

  render(): JSX.Element {
    return (
      <div style={{ padding: "10px 0", borderBottom: "1px solid #ccc", marginBottom: "10px" }}>
        <ButtonGroup fill>
          <Tooltip content="Save current parameters to a JSON file">
            <Button
              icon="download"
              text="Save Params"
              onClick={this.handleSaveDefaults}
              small
            />
          </Tooltip>
          
          <Tooltip content="Load parameters from a JSON file">
            <FileInput
              text="Load Params"
              buttonText="Browse..."
              onInputChange={this.handleLoadDefaults}
              inputProps={{
                accept: ".json",
                ref: this.fileInputRef,
              }}
              fill
              small
            />
          </Tooltip>
          
          <Tooltip content="Reset all parameters to their default values">
            <Button
              icon="refresh"
              text="Reset"
              onClick={this.handleResetToDefaults}
              intent={Intent.WARNING}
              small
            />
          </Tooltip>
        </ButtonGroup>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  reembedParams: state.reembedParameters,
});

const ConnectedDefaultsIO = connect(mapStateToProps)(DefaultsIO);

export { ConnectedDefaultsIO as DefaultsIO };