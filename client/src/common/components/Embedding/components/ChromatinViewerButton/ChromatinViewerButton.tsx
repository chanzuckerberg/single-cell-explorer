import React, { useEffect } from "react";
import { connect, useSelector } from "react-redux";
import { useCellTypesQuery } from "common/queries/cellType"; // Your existing hook
import { getFeatureFlag } from "util/featureFlags/featureFlags";
import { FEATURES } from "util/featureFlags/features";
import Icon from "components/icon/icon";
import { AppDispatch, RootState } from "reducers";
import { Schema } from "common/types/schema";
import { Button } from "@blueprintjs/core";
import { useChromatinViewerData } from "common/hooks/useChromatinViewerData";
import { ChromatinIconContainer } from "./style";
// import * as globals from "~/globals";

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

  // Get selected cell types from Redux state
  const selectedCellTypes = useSelector(
    (state: RootState) => state.controls.chromatinSelectedCellTypes || []
  );

  // Use the chromatin data hook to check if data exists
  const chromatinData = useChromatinViewerData(schema, selectedCellTypes);

  const chromatinButtonDisabled = !chromatinData.data;

  // const getChromatinTooltipContent = (): string => {
  //   if (!shouldEnableCellTypesQuery) return "Initializing...";
  //   if (cellTypesQuery.isLoading) return "Loading cell types...";
  //   if (cellTypesQuery.isError) return "Error loading cell types";
  //   if (!cellTypesQuery.data || cellTypesQuery.data.length === 0) return "No cell types available";
  //   if (chromatinData.isLoading) return "Loading chromatin data...";
  //   if (chromatinData.isError) return "Error loading chromatin data";
  //   if (chromatinData.hasValidData) return `Chromatin accessibility (${chromatinData.genomeVersion})`;
  //   return "Loading chromatin accessibility data...";
  // };

  // Determine whether to show the chromatin button
  const shouldShowChromatinButton =
    !isSidePanel &&
    getFeatureFlag(FEATURES.MULTIOME_VIZ) &&
    chromatinData.shouldShow;

  // Don't render anything if we shouldn't show the button
  if (!shouldShowChromatinButton) {
    return null;
  }

  return (
    // <Tooltip
    //   content={getChromatinTooltipContent()}
    //   position="top"
    //   hoverOpenDelay={globals.tooltipHoverOpenDelay}
    // >
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
    // </Tooltip>
  );
};

export default connect(mapStateToProps)(ChromatinViewerButton);
