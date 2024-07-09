import { RootState } from "../../../../reducers";

export interface Props {
  datasetMetadata: RootState["datasetMetadata"]["datasetMetadata"];
  schema: RootState["annoMatrix"]["schema"];
  singleContinuousValues: RootState["singleContinuousValue"]["singleContinuousValues"];
}

export const mapStateToProps = (state: RootState): Props => ({
  datasetMetadata: state.datasetMetadata.datasetMetadata,
  schema: state.annoMatrix.schema,
  singleContinuousValues: state.singleContinuousValue.singleContinuousValues,
});
