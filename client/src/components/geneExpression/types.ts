import { RootState } from "../../reducers";

export interface StateProps {
  annoMatrix: RootState["annoMatrix"];
  userDefinedGenes: RootState["quickGenes"]["userDefinedGenes"];
  userDefinedGenesLoading: RootState["quickGenes"]["userDefinedGenesLoading"];
}

export const mapStateToProps = (state: RootState): StateProps => ({
  annoMatrix: state.annoMatrix,
  userDefinedGenes: state.quickGenes.userDefinedGenes,
  userDefinedGenesLoading: state.quickGenes.userDefinedGenesLoading,
});
