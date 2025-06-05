import { AppDispatch, RootState } from "reducers";
import { DataframeValue } from "util/dataframe";

export interface State {
  geneIsExpanded: boolean;
}

export interface StateProps {
  isColorAccessor: boolean;
  isScatterplotXXaccessor: boolean;
  isScatterplotYYaccessor: boolean;
  isGeneInfo: boolean;
}

export interface DispatchProps {
  dispatch: AppDispatch;
}

export interface OwnProps {
  gene: { name: string; id: string };
  quickGene?: boolean;
  removeGene?: (gene: string) => () => void;
  geneId: DataframeValue;
  isGeneExpressionComplete: boolean;
  onGeneExpressionComplete: () => void;
  geneDescription?: string;
  geneset?: string;
}

export type Props = StateProps & OwnProps & DispatchProps;

export const mapStateToProps = (
  state: RootState,
  ownProps: OwnProps
): StateProps => {
  const { gene } = ownProps;

  return {
    isColorAccessor:
      state.colors.colorAccessor === gene.id &&
      state.colors.colorMode !== "color by categorical metadata",
    isScatterplotXXaccessor: state.controls.scatterplotXXaccessor === gene.id,
    isScatterplotYYaccessor: state.controls.scatterplotYYaccessor === gene.id,
    isGeneInfo: state.controls.geneInfo.gene === gene.id,
  };
};
export const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});
