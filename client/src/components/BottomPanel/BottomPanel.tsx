import React, { useEffect, useMemo } from "react";
import { connect, useSelector } from "react-redux";
import { useCellTypesQuery } from "common/queries/cellType";
import { RootState } from "reducers";
import { ChromosomeMap } from "./components/ChromosomeMap/ChromosomeMap";
import { Props, mapStateToProps } from "./types";
import {
  BottomPanelContainer,
  BottomPanelHeader,
  BottomPanelHeaderTitle,
  BottomPanelWrapper,
  BottomPanelButton,
  BottomPanelHeaderActions,
} from "./style";

const MAX_CELL_TYPES = 2;

const BottomSideBar = ({
  dispatch,
  bottomPanelMinimized,
  bottomPanelHidden,
}: Props) => {
  const cellTypesQuery = useCellTypesQuery({ enabled: !bottomPanelHidden && !bottomPanelMinimized });
  const { selectedCellTypes } = useSelector((state: RootState) => ({
    selectedCellTypes: state.controls.chromatinSelectedCellTypes,
  }))

  const cellTypes = useMemo(
    () => cellTypesQuery.data ?? [],
    [cellTypesQuery.data],
  );

  useEffect(() => {
    if (selectedCellTypes.length === 0 && cellTypes.length > 0) {
      // Add initial histogram if none are selected.
      dispatch({
        type: 'toggle chromatin histogram',
        cellType: cellTypes[0],
      });
    }
  }, [cellTypes, dispatch, selectedCellTypes.length])

  return (
    <BottomPanelWrapper isHidden={bottomPanelHidden}>
      <BottomPanelHeader>
        <BottomPanelHeaderTitle>
          Chromatin Accessibility Viewer
        </BottomPanelHeaderTitle>

        <BottomPanelHeaderActions>
          <BottomPanelButton
            active={false}
            data-testid="add-cell-type"
            minimal
            text="Add Cell Type"
            icon="plus"
            onClick={() => {
              const cellType = cellTypes.find(type => !selectedCellTypes.includes(type));

              if (!cellType) {
                return;
              }

              dispatch({
                type: 'toggle chromatin histogram',
                cellType,
              })
            }}
            disabled={cellTypesQuery.isLoading || selectedCellTypes.length === MAX_CELL_TYPES}
          />

          <BottomPanelButton
            active={false}
            data-testid="minimize-bottom-panel"
            minimal
            text=""
            rightIcon={bottomPanelMinimized ? "maximize" : "minimize"}
            onClick={() =>
              dispatch({
                type: "toggle minimize multiome viz panel",
              })
            }
          />

          <BottomPanelButton
            active={false}
            data-testid="close-bottom-panel"
            minimal
            text=""
            rightIcon="cross"
            onClick={() =>
              dispatch({
                type: "close multiome viz panel",
              })
            }
          />
        </BottomPanelHeaderActions>
      </BottomPanelHeader>

      {!bottomPanelMinimized && (
        <BottomPanelContainer>
          <ChromosomeMap />
        </BottomPanelContainer>
      )}
    </BottomPanelWrapper>
  );
};

export default connect(mapStateToProps)(BottomSideBar);
