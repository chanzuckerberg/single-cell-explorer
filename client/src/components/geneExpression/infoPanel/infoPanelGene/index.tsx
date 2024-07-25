import React from "react";
import { connect } from "react-redux";
import { Props, mapStateToProps } from "./types";
import ContainerInfo from "../common/infoPanelContainer";

function GeneInfo(props: Props) {
  const { geneInfo } = props;

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
    <ContainerInfo
      id={null}
      name={geneName}
      symbol={gene ?? undefined}
      description={geneSummary}
      synonyms={geneSynonyms}
      references={[]}
      error={infoError}
      loading={loading}
      infoType="Gene"
      url={geneUrl}
      showWarningBanner={showWarningBanner}
    />
  );
}

export default connect(mapStateToProps)(GeneInfo);
