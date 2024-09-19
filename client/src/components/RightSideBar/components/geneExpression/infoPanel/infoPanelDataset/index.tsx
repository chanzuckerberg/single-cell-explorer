import React from "react";
import { connect } from "react-redux";

import InfoFormat from "./datasetInfoFormat";
import { Props, mapStateToProps } from "./types";
import { useConnect } from "./connect";

function DatasetInfo(props: Props) {
  const { datasetMetadata, schema, singleContinuousValues } = props;
  const { allSingleValues } = useConnect({ schema, singleContinuousValues });

  return (
    <InfoFormat
      {...{
        datasetMetadata,
        allSingleValues,
      }}
    />
  );
}

export default connect(mapStateToProps)(DatasetInfo);
