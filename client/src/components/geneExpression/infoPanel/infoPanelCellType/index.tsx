import React, { useMemo } from "react";
import { connect } from "react-redux";
import { Props, mapStateToProps } from "./types";
import InfoPanelContainer from "../common/infoPanelContainer";
import { CELLGUIDE_URL } from "../common/constants";

function CellTypeInfo(props: Props) {
  const { cellInfo, cellTypes } = props;

  const {
    cellId,
    cellName,
    cellDescription,
    synonyms,
    references,
    error,
    loading,
  } = cellInfo;

  const quickList = useMemo(
    () => cellTypes.map((cellType) => cellType.cellTypeName),
    [cellTypes]
  );

  return (
    <InfoPanelContainer
      id={cellId}
      name={cellName}
      description={cellDescription}
      synonyms={synonyms}
      references={references}
      error={error}
      loading={loading}
      infoType="Cell Type"
      url={CELLGUIDE_URL}
      quickList={quickList}
    />
  );
}

export default connect(mapStateToProps)(CellTypeInfo);
