import { RootState } from "../../../../reducers";

export interface Props {
  geneSummary: string;
  geneName: string;
  gene: string;
  geneUrl: string;
  geneSynonyms: string[];
  showWarningBanner: boolean;
  infoError: string;
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
