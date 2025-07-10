import React, { useEffect } from "react";
import { connect, useSelector } from "react-redux";
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
  hasChromatinData: RootState["controls"]["hasChromatinData"];
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
  hasChromatinData: state.controls.hasChromatinData,
});

const ChromatinViewerButton = ({
  dispatch,
  isSidePanel,
  bottomPanelHidden,
  schema,
  hasChromatinData,
}: Props) => {
  const handleChromatinViewClick = () => {
    dispatch({
      type: bottomPanelHidden
        ? "open multiome viz panel"
        : "close multiome viz panel",
    });
  };

  const selectedCellTypes = useSelector(
    (state: RootState) => state.controls.chromatinSelectedCellTypes || []
  );

  useChromatinViewerData(schema, selectedCellTypes);

  const shouldShowChromatinButton =
    !isSidePanel && getFeatureFlag(FEATURES.MULTIOME_VIZ) && hasChromatinData;

  useEffect(() => {
    if (shouldShowChromatinButton) {
      dispatch({
        type: "open multiome viz panel",
      });
    }
    return () => {};
  }, [shouldShowChromatinButton, dispatch]);

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
    />
  );
};

export default connect(mapStateToProps)(ChromatinViewerButton);
