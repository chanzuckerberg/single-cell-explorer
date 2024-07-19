import React from "react";
import { connect } from "react-redux";
import { Props, mapStateToProps } from "./types";
import ContainerInfo from "../common/containerInfo";
import { CELLGUIDE_URL } from "../common/constants";

function CellTypeInfo(props: Props) {
  const { cellInfo } = props;

  const {
    cellId,
    cellName,
    cellDescription,
    synonyms,
    references,
    error,
    loading,
  } = cellInfo;

  return (
    <ContainerInfo
      id={cellId}
      name={cellName}
      description={cellDescription}
      synonyms={synonyms}
      references={references}
      error={error}
      loading={loading}
      entity="Cell Type"
      url={CELLGUIDE_URL}
    />
  );
}

export default connect(mapStateToProps)(CellTypeInfo);
