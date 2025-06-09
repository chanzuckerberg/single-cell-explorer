import React, { useEffect } from "react";
import { connect, useSelector } from "react-redux";
import { useCellTypesQuery } from "common/queries/cellType";
import { getFeatureFlag } from "util/featureFlags/featureFlags";
import { FEATURES } from "util/featureFlags/features";
import Icon from "components/icon/icon";
import { AppDispatch, RootState } from "reducers";
import { Schema } from "common/types/schema";
import { Button } from "@blueprintjs/core";
import { useChromatinViewerData } from "common/hooks/useChromatinViewerData";
import { ChromatinIconContainer } from "./style";

type Props = StateProps & DispatchProps & OwnProps;

interface StateProps {
  schema?: Schema;
  bottomPanelHidden: RootState["controls"]["bottomPanelHidden"];
}

interface OwnProps {
  isSidePanel: boolean;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

const mapStateToProps = (state: RootState): StateProps => ({
  schema: state.annoMatrix?.schema,
  bottomPanelHidden: state.controls.bottomPanelHidden,
});

const ChromatinViewerButton = ({
  dispatch,
  isSidePanel,
  bottomPanelHidden,
  schema,
}: Props) => {
  const handleChromatinViewClick = () => {
    dispatch({
      type: bottomPanelHidden
        ? "open multiome viz panel"
        : "close multiome viz panel",
    });
  };

  // Get dataset's cell types
  const cellTypesQuery = useCellTypesQuery({
    enabled: !isSidePanel && getFeatureFlag(FEATURES.MULTIOME_VIZ),
  });

  // Add first cell type as default to selected cell types
  useEffect(() => {
    const availableCellTypes = cellTypesQuery.data;

    if (availableCellTypes && availableCellTypes.length > 0) {
      const defaultCellType = availableCellTypes[0];
      dispatch({
        type: "toggle chromatin cell types",
        cellType: defaultCellType,
      });
    }
  }, [cellTypesQuery.data, dispatch]);

  const selectedCellTypes = useSelector(
    (state: RootState) => state.controls.chromatinSelectedCellTypes || []
  );

  const chromatinData = useChromatinViewerData(schema, selectedCellTypes);
  const chromatinButtonDisabled = !chromatinData.data;

  const shouldShowChromatinButton =
    !isSidePanel &&
    getFeatureFlag(FEATURES.MULTIOME_VIZ) &&
    chromatinData.shouldShow;

  useEffect(() => {
    if (shouldShowChromatinButton && chromatinButtonDisabled) {
      dispatch({
        type: "open multiome viz panel",
      });
    }
    return () => {};
  }, [shouldShowChromatinButton, chromatinButtonDisabled, dispatch]);

  if (!shouldShowChromatinButton) {
    return null;
  }

  return (
    <Button
      icon={
        <ChromatinIconContainer active={!bottomPanelHidden}>
          <Icon icon="chromatin-view" />
        </ChromatinIconContainer>
      }
      onClick={handleChromatinViewClick}
      active={!bottomPanelHidden}
      disabled={chromatinButtonDisabled}
    />
  );
};

export default connect(mapStateToProps)(ChromatinViewerButton);
