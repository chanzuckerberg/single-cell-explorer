/**
 * DimensionalityReductionPanel component
 * Converted from excellxgene/client/src/components/menubar/dimredpanel.js
 */

import React, { Component } from "react";
import { connect } from "react-redux";
import {
  Checkbox,
  FormGroup,
  HTMLSelect,
  NumericInput,
  InputGroup,
  Card,
  Elevation,
} from "@blueprintjs/core";

import { RootState, AppDispatch } from "../../reducers";
import { setReembeddingParameter } from "../../actions/reembed";
import {
  ReembeddingParameters,
  DimensionalityReductionPanelProps,
} from "../../common/types/reembed";

interface DimensionalityReductionPanelConnectedProps extends DimensionalityReductionPanelProps {
  reembedParams: ReembeddingParameters;
  annoMatrix: any; // TODO: Type this properly
  dispatch: AppDispatch;
}

class DimensionalityReductionPanel extends Component<DimensionalityReductionPanelConnectedProps> {
  handleParameterChange = (key: keyof ReembeddingParameters) => (value: any) => {
    const { dispatch } = this.props;
    dispatch(setReembeddingParameter(key, value));
  };

  handleInputChange = (key: keyof ReembeddingParameters) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { dispatch } = this.props;
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    dispatch(setReembeddingParameter(key, value));
  };

  handleSelectChange = (key: keyof ReembeddingParameters) => (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { dispatch } = this.props;
    dispatch(setReembeddingParameter(key, event.target.value));
  };

  render(): JSX.Element {
    const { reembedParams, annoMatrix, embName, onChange } = this.props;

    // Get available categorical columns for batch correction
    const categoricalColumns = annoMatrix?.schema?.annotations?.obs?.columns
      ?.filter((col: any) => col.type === "categorical")
      ?.map((col: any) => col.name) || [];

    // Get available embeddings for latent space selection
    const availableEmbeddings = annoMatrix?.schema?.dataframe?.nEmb
      ? Object.keys(annoMatrix.schema.dataframe.nEmb)
      : [];

    return (
      <div style={{ padding: "10px" }}>
        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>Embedding Name</h4>
          <FormGroup label="New embedding name" labelFor="embName">
            <InputGroup
              id="embName"
              value={embName}
              onChange={onChange}
              placeholder="Enter embedding name..."
              fill
            />
          </FormGroup>
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>Embedding Mode</h4>
          <FormGroup label="Mode" labelFor="embeddingMode">
            <HTMLSelect
              id="embeddingMode"
              value={reembedParams.embeddingMode}
              onChange={this.handleSelectChange("embeddingMode")}
              fill
            >
              <option value="Preprocess and run">Preprocess and run</option>
              <option value="Run UMAP">Run UMAP</option>
              <option value="Skip">Skip</option>
            </HTMLSelect>
          </FormGroup>

          {reembedParams.embeddingMode === "Run UMAP" && (
            <FormGroup label="Latent space" labelFor="latentSpace">
              <HTMLSelect
                id="latentSpace"
                value={reembedParams.latentSpace}
                onChange={this.handleSelectChange("latentSpace")}
                fill
              >
                <option value="">Select latent space...</option>
                {availableEmbeddings.map((emb: string) => (
                  <option key={emb} value={emb}>
                    {emb}
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>
          )}
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>Principal Component Analysis</h4>
          
          <FormGroup label="Number of PCs" labelFor="numPCs">
            <NumericInput
              id="numPCs"
              value={reembedParams.numPCs}
              onValueChange={this.handleParameterChange("numPCs")}
              min={10}
              max={100}
              stepSize={5}
              fill
            />
          </FormGroup>

          <FormGroup label="PCA solver" labelFor="pcaSolver">
            <HTMLSelect
              id="pcaSolver"
              value={reembedParams.pcaSolver}
              onChange={this.handleSelectChange("pcaSolver")}
              fill
            >
              <option value="randomized">Randomized</option>
              <option value="full">Full</option>
              <option value="arpack">ARPACK</option>
            </HTMLSelect>
          </FormGroup>

          <Checkbox
            checked={reembedParams.kernelPca}
            onChange={this.handleInputChange("kernelPca")}
            label="Kernel PCA"
          />

          <Checkbox
            checked={reembedParams.scaleData}
            onChange={this.handleInputChange("scaleData")}
            label="Scale data"
          />
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>Neighbors</h4>
          
          <FormGroup label="Number of neighbors" labelFor="neighborsKnn">
            <NumericInput
              id="neighborsKnn"
              value={reembedParams.neighborsKnn}
              onValueChange={this.handleParameterChange("neighborsKnn")}
              min={5}
              max={100}
              stepSize={5}
              fill
            />
          </FormGroup>

          <FormGroup label="Distance metric" labelFor="distanceMetric">
            <HTMLSelect
              id="distanceMetric"
              value={reembedParams.distanceMetric}
              onChange={this.handleSelectChange("distanceMetric")}
              fill
            >
              <option value="cosine">Cosine</option>
              <option value="euclidean">Euclidean</option>
              <option value="manhattan">Manhattan</option>
            </HTMLSelect>
          </FormGroup>

          <FormGroup label="Neighbors method" labelFor="neighborsMethod">
            <HTMLSelect
              id="neighborsMethod"
              value={reembedParams.neighborsMethod}
              onChange={this.handleSelectChange("neighborsMethod")}
              fill
            >
              <option value="umap">UMAP</option>
              <option value="gauss">Gauss</option>
            </HTMLSelect>
          </FormGroup>
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>UMAP</h4>
          
          <FormGroup label="Minimum distance" labelFor="umapMinDist">
            <NumericInput
              id="umapMinDist"
              value={reembedParams.umapMinDist}
              onValueChange={this.handleParameterChange("umapMinDist")}
              min={0.0}
              max={1.0}
              stepSize={0.01}
              minorStepSize={0.001}
              majorStepSize={0.1}
              fill
            />
          </FormGroup>
        </Card>

        <Card elevation={Elevation.ONE} style={{ marginBottom: "10px" }}>
          <h4>Batch Correction</h4>

          <Checkbox
            checked={reembedParams.doBatch}
            onChange={this.handleInputChange("doBatch")}
            label="Enable batch correction"
          />

          {reembedParams.doBatch && (
            <>
              <FormGroup label="Batch method" labelFor="batchMethod">
                <HTMLSelect
                  id="batchMethod"
                  value={reembedParams.batchMethod}
                  onChange={this.handleSelectChange("batchMethod")}
                  fill
                >
                  <option value="Scanorama">Scanorama</option>
                  <option value="BBKNN">BBKNN</option>
                </HTMLSelect>
              </FormGroup>

              <FormGroup label="Batch key" labelFor="batchKey">
                <HTMLSelect
                  id="batchKey"
                  value={reembedParams.batchKey}
                  onChange={this.handleSelectChange("batchKey")}
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

              {reembedParams.batchMethod === "Scanorama" && (
                <>
                  <FormGroup label="KNN" labelFor="scanoramaKnn">
                    <NumericInput
                      id="scanoramaKnn"
                      value={reembedParams.scanoramaKnn}
                      onValueChange={this.handleParameterChange("scanoramaKnn")}
                      min={5}
                      max={50}
                      stepSize={5}
                      fill
                    />
                  </FormGroup>

                  <FormGroup label="Sigma" labelFor="scanoramaSigma">
                    <NumericInput
                      id="scanoramaSigma"
                      value={reembedParams.scanoramaSigma}
                      onValueChange={this.handleParameterChange("scanoramaSigma")}
                      min={1}
                      max={50}
                      stepSize={1}
                      fill
                    />
                  </FormGroup>

                  <FormGroup label="Alpha" labelFor="scanoramaAlpha">
                    <NumericInput
                      id="scanoramaAlpha"
                      value={reembedParams.scanoramaAlpha}
                      onValueChange={this.handleParameterChange("scanoramaAlpha")}
                      min={0.0}
                      max={1.0}
                      stepSize={0.01}
                      fill
                    />
                  </FormGroup>

                  <FormGroup label="Batch size" labelFor="scanoramaBatchSize">
                    <NumericInput
                      id="scanoramaBatchSize"
                      value={reembedParams.scanoramaBatchSize}
                      onValueChange={this.handleParameterChange("scanoramaBatchSize")}
                      min={1000}
                      max={10000}
                      stepSize={1000}
                      fill
                    />
                  </FormGroup>
                </>
              )}

              {reembedParams.batchMethod === "BBKNN" && (
                <FormGroup label="Neighbors within batch" labelFor="bbknnNeighborsWithinBatch">
                  <NumericInput
                    id="bbknnNeighborsWithinBatch"
                    value={reembedParams.bbknnNeighborsWithinBatch}
                    onValueChange={this.handleParameterChange("bbknnNeighborsWithinBatch")}
                    min={1}
                    max={10}
                    stepSize={1}
                    fill
                  />
                </FormGroup>
              )}
            </>
          )}
        </Card>

        <Card elevation={Elevation.ONE}>
          <h4>SAM (Self-Assembling Manifolds)</h4>

          <Checkbox
            checked={reembedParams.doSAM}
            onChange={this.handleInputChange("doSAM")}
            label="Enable SAM"
          />

          {reembedParams.doSAM && (
            <>
              <Checkbox
                checked={reembedParams.samHVG}
                onChange={this.handleInputChange("samHVG")}
                label="SAM HVG"
              />

              <Checkbox
                checked={reembedParams.jointHVG}
                onChange={this.handleInputChange("jointHVG")}
                label="Joint HVG"
              />

              <FormGroup label="NNA SAM" labelFor="nnaSAM">
                <NumericInput
                  id="nnaSAM"
                  value={reembedParams.nnaSAM}
                  onValueChange={this.handleParameterChange("nnaSAM")}
                  min={10}
                  max={100}
                  stepSize={10}
                  fill
                />
              </FormGroup>

              <FormGroup label="Weight mode" labelFor="weightModeSAM">
                <HTMLSelect
                  id="weightModeSAM"
                  value={reembedParams.weightModeSAM}
                  onChange={this.handleSelectChange("weightModeSAM")}
                  fill
                >
                  <option value="rms">RMS</option>
                  <option value="uniform">Uniform</option>
                </HTMLSelect>
              </FormGroup>

              <Checkbox
                checked={reembedParams.calculateSamWeights}
                onChange={this.handleInputChange("calculateSamWeights")}
                label="Calculate SAM weights"
              />
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

const ConnectedDimensionalityReductionPanel = connect(mapStateToProps)(DimensionalityReductionPanel);

export { ConnectedDimensionalityReductionPanel as DimensionalityReductionPanel };