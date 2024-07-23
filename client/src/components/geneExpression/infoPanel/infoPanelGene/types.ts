import { RootState } from "../../../../reducers";

export interface Props {
  geneInfo: RootState["controls"]["geneInfo"];
}

export const mapStateToProps = (state: RootState): Props => ({
  geneInfo: state.controls.geneInfo,
});
