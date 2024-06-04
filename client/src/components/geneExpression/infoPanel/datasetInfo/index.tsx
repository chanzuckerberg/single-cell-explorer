import React from "react";
import { connect } from "react-redux";

import InfoFormat, { SingleValues } from "./datasetInfoFormat";
import { RootState } from "../../../../reducers";
import { selectableCategoryNames } from "../../../../util/stateManager/controlsHelpers";
import { DatasetMetadata } from "../../../../common/types/entities";
import { Schema } from "../../../../common/types/schema";
import { SingleContinuousValueState } from "../../../../reducers/singleContinuousValue";

interface Props {
  datasetMetadata: DatasetMetadata;
  schema: Schema;
  singleContinuousValues: SingleContinuousValueState["singleContinuousValues"];
}

const mapStateToProps = (state: RootState): Props => ({
  datasetMetadata: state.datasetMetadata?.datasetMetadata,
  schema: state.annoMatrix?.schema,
  singleContinuousValues: state.singleContinuousValue.singleContinuousValues,
});

const DatasetInfo = (props: Props) => {
  const { datasetMetadata, schema, singleContinuousValues } = props;

  const allCategoryNames = selectableCategoryNames(schema).sort();
  const allSingleValues: SingleValues = new Map();

  allCategoryNames.forEach((catName) => {
    const isUserAnno = schema?.annotations?.obsByName[catName]?.writable;
    const colSchema = schema.annotations.obsByName[catName];
    if (!isUserAnno && colSchema.categories?.length === 1) {
      allSingleValues.set(catName, colSchema.categories[0]);
    }
  });
  singleContinuousValues.forEach((value, catName) => {
    allSingleValues.set(catName, value);
  });

  return (
    <InfoFormat
      {...{
        datasetMetadata,
        allSingleValues,
      }}
    />
  );
};

export default connect(mapStateToProps)(DatasetInfo);
