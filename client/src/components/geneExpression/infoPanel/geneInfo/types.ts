import { RootState } from "../../../../reducers";

export interface Props {
  geneSummary: RootState["controls"]["geneSummary"];
  geneName: RootState["controls"]["geneName"];
  gene: RootState["controls"]["gene"];
  geneUrl: RootState["controls"]["geneUrl"];
  geneSynonyms: RootState["controls"]["geneSynonyms"];
  showWarningBanner: RootState["controls"]["showWarningBanner"];
  infoError: RootState["controls"]["infoError"];
}

export const mapStateToProps = (state: RootState): Props => ({
  geneSummary: state.controls.geneSummary,
  geneName: state.controls.geneName,
  gene: state.controls.gene,
  geneUrl: state.controls.geneUrl,
  geneSynonyms: state.controls.geneSynonyms,
  showWarningBanner: state.controls.showWarningBanner,
  infoError: state.controls.infoError,
});
