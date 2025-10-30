/**
 * PreprocessingPanel component
 * Converted from excellxgene/client/src/components/menubar/preppanel.js
 */

import React, { Component } from "react";
import { connect } from "react-redux";
import { Card, Checkbox, Elevation, FormGroup, H4, HTMLSelect, NumericInput } from "@blueprintjs/core";

import { RootState, AppDispatch } from "../../reducers";
import { setReembeddingParameter } from "../../actions/reembed";
import {
  ReembeddingParameters,
  PreprocessingPanelProps,
} from "../../common/types/reembed";

interface PreprocessingPanelConnectedProps extends PreprocessingPanelProps {
  reembedParams: ReembeddingParameters;
  annoMatrix: any; // TODO: Type this properly
  dispatch: AppDispatch;
}

class PreprocessingPanel extends Component<PreprocessingPanelConnectedProps> {
  handleParameterChange =
    (key: keyof ReembeddingParameters) => (value: any) => {
      const { dispatch } = this.props;
      dispatch(setReembeddingParameter(key, value));
    };

  handleInputChange =
    (key: keyof ReembeddingParameters) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { dispatch } = this.props;
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      dispatch(setReembeddingParameter(key, value));
    };

  handleSelectChange =
    (key: keyof ReembeddingParameters) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { dispatch } = this.props;
      dispatch(setReembeddingParameter(key, event.target.value));
    };

  render(): JSX.Element {
    const { reembedParams, annoMatrix } = this.props;

    // Get available categorical columns for batch preparation
    const categoricalColumns =
      annoMatrix?.schema?.annotations?.obs?.columns
        ?.filter((col: any) => col.type === "categorical")
        ?.map((col: any) => col.name) || [];

    // Get available layers
    const availableLayers = ["X", "raw.X"]; // TODO: Get from actual data

    return (
      <div style={{ padding: "10px" }}>
        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <H4>Cell and Gene Filtering</H4>

          <FormGroup label="Minimum counts per cell" labelFor="minCountsCF">
            <NumericInput
              id="minCountsCF"
              value={reembedParams.minCountsCF}
              onValueChange={this.handleParameterChange("minCountsCF")}
              min={0}
              stepSize={1}
              fill
            />
          </FormGroup>

          <FormGroup label="Minimum genes per cell" labelFor="minGenesCF">
            <NumericInput
              id="minGenesCF"
              value={reembedParams.minGenesCF}
              onValueChange={this.handleParameterChange("minGenesCF")}
              min={0}
              stepSize={1}
              fill
            />
          </FormGroup>

          <FormGroup label="Minimum cells per gene" labelFor="minCellsGF">
            <NumericInput
              id="minCellsGF"
              value={reembedParams.minCellsGF}
              onValueChange={this.handleParameterChange("minCellsGF")}
              min={0}
              stepSize={1}
              fill
            />
          </FormGroup>

          <FormGroup label="Maximum cells per gene (%)" labelFor="maxCellsGF">
            <NumericInput
              id="maxCellsGF"
              value={reembedParams.maxCellsGF}
              onValueChange={this.handleParameterChange("maxCellsGF")}
              min={0}
              max={100}
              stepSize={1}
              fill
            />
          </FormGroup>

          <FormGroup label="Minimum counts per gene" labelFor="minCountsGF">
            <NumericInput
              id="minCountsGF"
              value={reembedParams.minCountsGF}
              onValueChange={this.handleParameterChange("minCountsGF")}
              min={0}
              stepSize={1}
              fill
            />
          </FormGroup>
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <H4>Highly Variable Genes</H4>

          <FormGroup label="Number of top genes" labelFor="nTopGenesHVG">
            <NumericInput
              id="nTopGenesHVG"
              value={reembedParams.nTopGenesHVG}
              onValueChange={this.handleParameterChange("nTopGenesHVG")}
              min={100}
              max={10000}
              stepSize={100}
              fill
            />
          </FormGroup>

          <FormGroup label="Number of bins" labelFor="nBinsHVG">
            <NumericInput
              id="nBinsHVG"
              value={reembedParams.nBinsHVG}
              onValueChange={this.handleParameterChange("nBinsHVG")}
              min={10}
              max={50}
              stepSize={5}
              fill
            />
          </FormGroup>
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <H4>Normalization</H4>

          <FormGroup label="Data layer" labelFor="dataLayer">
            <HTMLSelect
              id="dataLayer"
              value={reembedParams.dataLayer}
              onChange={this.handleSelectChange("dataLayer")}
              fill
            >
              {availableLayers.map((layer) => (
                <option key={layer} value={layer}>
                  {layer}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>

          <Checkbox
            checked={reembedParams.logTransform}
            onChange={this.handleInputChange("logTransform")}
            label="Log transform"
          />

          <Checkbox
            checked={reembedParams.sumNormalizeCells}
            onChange={this.handleInputChange("sumNormalizeCells")}
            label="Sum normalize cells"
          />
        </Card>

        <Card elevation={Elevation.ONE}>
          <H4>Batch Preprocessing</H4>

          <Checkbox
            checked={reembedParams.doBatchPrep}
            onChange={this.handleInputChange("doBatchPrep")}
            label="Enable batch preprocessing"
          />

          {reembedParams.doBatchPrep && (
            <>
              <FormGroup label="Batch key" labelFor="batchPrepKey">
                <HTMLSelect
                  id="batchPrepKey"
                  value={reembedParams.batchPrepKey}
                  onChange={this.handleSelectChange("batchPrepKey")}
                  fill
                >
                  <option value="">Select batch key...</option>
                  {categoricalColumns.map((col: string) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </HTMLSelect>
              </FormGroup>

              {reembedParams.batchPrepKey && (
                <FormGroup label="Batch label" labelFor="batchPrepLabel">
                  <HTMLSelect
                    id="batchPrepLabel"
                    value={reembedParams.batchPrepLabel}
                    onChange={this.handleSelectChange("batchPrepLabel")}
                    fill
                  >
                    <option value="">Select batch label...</option>
                    {/* TODO: Get actual values for selected batch key */}
                  </HTMLSelect>
                </FormGroup>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  reembedParams: state.reembedParameters,
  annoMatrix: state.annoMatrix,
});

const ConnectedPreprocessingPanel =
  connect(mapStateToProps)(PreprocessingPanel);

export { ConnectedPreprocessingPanel as PreprocessingPanel };
