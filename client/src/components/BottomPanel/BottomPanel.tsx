import React, { useEffect, useMemo } from "react";
import { connect, useSelector } from "react-redux";
import { useCellTypesQuery } from "common/queries/cellType";
import { RootState } from "reducers";
import { Tooltip } from "@blueprintjs/core";
import { ChromosomeMap } from "./components/ChromosomeMap/ChromosomeMap";
import { Props, mapStateToProps } from "./types";
import { GeneSelect } from "./components/GeneSelect/GeneSelect";
import {
  BottomPanelHeader,
  BottomPanelHeaderTitle,
  BottomPanelWrapper,
  BottomPanelButton,
  BottomPanelHeaderActions,
  InfoIcon,
  ChromosomeMapWrapper,
  TooltipContent,
} from "./style";

const MAX_CELL_TYPES = 2;

const BottomSideBar = ({
  dispatch,
  bottomPanelMinimized = false,
  bottomPanelHidden,
}: Props) => {
  // Get ATAC-seq dataset's cell types
  const cellTypesQuery = useCellTypesQuery();

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

  const { selectedCellTypes } = useSelector((state: RootState) => ({
    selectedCellTypes: state.controls.chromatinSelectedCellTypes,
  }));

  const cellTypes = useMemo(
    () => cellTypesQuery.data ?? [],
    [cellTypesQuery.data]
  );

  // Don't render if no ATAC data is available (cell types query returns empty array)
  // Wait for the query to complete before deciding whether to render
  if (
    !cellTypesQuery.isLoading &&
    cellTypesQuery.data &&
    cellTypesQuery.data.length === 0
  ) {
    return null;
  }

  return (
    <BottomPanelWrapper
      isHidden={bottomPanelHidden}
      isMinimized={bottomPanelMinimized}
    >
      <BottomPanelHeader isMinimized={bottomPanelMinimized}>
        <BottomPanelHeaderTitle>
          Chromatin Accessibility {!bottomPanelMinimized && `(scATAC-seq)`}
          <Tooltip
            content={
              <TooltipContent>
                Coverage tracks show normalized chromatin accessibility for each
                cell type. scATAC-seq signals were aggregated across cells
                within each type in 100bp genomic bins, divided by the cell
                type&apos;s total fragment count, and multiplied by 10^6 for
                visualization.
              </TooltipContent>
            }
            position="bottom"
          >
            <InfoIcon sdsIcon="InfoCircle" sdsSize="xs" sdsType="interactive" />
          </Tooltip>
        </BottomPanelHeaderTitle>
        <BottomPanelHeaderActions>
          {!bottomPanelMinimized && (
            <>
              <GeneSelect />
              <BottomPanelButton
                active={false}
                data-testid="add-cell-type"
                id="add-cell-type-button"
                minimal
                text="Add Cell Type"
                icon="plus"
                onClick={() => {
                  const cellType = cellTypes.find(
                    (type) => !selectedCellTypes.includes(type)
                  );
                  if (!cellType) {
                    return;
                  }
                  dispatch({
                    type: "toggle chromatin cell types",
                    cellType,
                  });
                }}
                disabled={
                  cellTypesQuery.isLoading ||
                  selectedCellTypes.length === MAX_CELL_TYPES
                }
              />
            </>
          )}
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
        <ChromosomeMapWrapper>
          <ChromosomeMap />
        </ChromosomeMapWrapper>
      )}
    </BottomPanelWrapper>
  );
};

export default connect(mapStateToProps)(BottomSideBar);
