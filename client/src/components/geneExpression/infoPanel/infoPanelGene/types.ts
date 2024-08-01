import { RootState } from "../../../../reducers";

export interface Props {
  geneInfo: RootState["controls"]["geneInfo"];
  geneList: RootState["controls"]["geneList"];
}

export const mapStateToProps = (state: RootState): Props => ({
  geneInfo: state.controls.geneInfo,
  geneList: state.controls.geneList,
});
