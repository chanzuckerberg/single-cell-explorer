import { DatasetMetadata } from "../../../../common/types/entities";
import { Schema } from "../../../../common/types/schema";
import { RootState } from "../../../../reducers";
import { SingleContinuousValueState } from "../../../../reducers/singleContinuousValue";

export interface Props {
  datasetMetadata: DatasetMetadata;
  schema: Schema;
  singleContinuousValues: SingleContinuousValueState["singleContinuousValues"];
}

export const mapStateToProps = (state: RootState): Props => ({
  datasetMetadata: state.datasetMetadata?.datasetMetadata,
  schema: state.annoMatrix?.schema,
  singleContinuousValues: state.singleContinuousValue.singleContinuousValues,
});
