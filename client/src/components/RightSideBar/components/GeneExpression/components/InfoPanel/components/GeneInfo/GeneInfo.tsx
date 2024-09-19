import React from "react";
import { connect } from "react-redux";

import { EMPTY_ARRAY } from "common/constants";
import { Props, mapStateToProps } from "./types";
import InfoPanelContainer from "../InfoPanelContainer/InfoPanelContainer";

function GeneInfo(props: Props) {
  const { geneInfo, geneList } = props;

  const {
    geneName,
    geneSummary,
    gene,
    geneUrl,
    geneSynonyms,
    showWarningBanner,
    infoError,
    loading,
  } = geneInfo;

  return (
    <InfoPanelContainer
      id={null}
      name={geneName}
      symbol={gene ?? undefined}
      description={geneSummary}
      synonyms={geneSynonyms}
      references={EMPTY_ARRAY}
      error={infoError}
      loading={loading}
      infoType="Gene"
      url={geneUrl}
      showWarningBanner={showWarningBanner}
      quickList={geneList}
    />
  );
}

export default connect(mapStateToProps)(GeneInfo);
