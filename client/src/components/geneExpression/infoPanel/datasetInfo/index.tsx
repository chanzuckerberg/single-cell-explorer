import React from "react";
import { connect } from "react-redux";

<<<<<<< HEAD
import InfoFormat from "./datasetInfoFormat";
import { Props, mapStateToProps } from "./types";
import { useConnect } from "./connect";

function DatasetInfo(props: Props) {
  const { datasetMetadata, schema, singleContinuousValues } = props;
  const { allSingleValues } = useConnect({ schema, singleContinuousValues });
=======
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
>>>>>>> 238db020 (done all but tests)

  return (
    <InfoFormat
      {...{
        datasetMetadata,
        allSingleValues,
      }}
    />
  );
<<<<<<< HEAD
}
=======
};
>>>>>>> 238db020 (done all but tests)

export default connect(mapStateToProps)(DatasetInfo);
