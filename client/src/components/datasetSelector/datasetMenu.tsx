/* Core dependencies */
import { Menu, MenuItem, Popover, Position } from "@blueprintjs/core";
import React from "react";

/* App dependencies */
import { Dataset } from "../../common/types/entities";

/* Styles */
// @ts-expect-error --- TODO fix import
import styles from "./datasetSelector.css";

/**
 * Function invoked on select of dataset.
 */
export type DatasetSelectedFn = (dataset: Dataset) => void;

interface Props {
  children: React.ReactNode;
  datasets: Dataset[];
  onDatasetSelected: DatasetSelectedFn;
}

/**
 * Build menu item elements from given array of menu item props.
 * @param datasets - Set of menu item props to display as menu item.
 * @param onDatasetSelected - Function invoked on click of menu item.
 * @returns Array of MenuItem elements.
 */
const buildDatasetMenuItems = (
  datasets: Dataset[],
  onDatasetSelected: DatasetSelectedFn
): JSX.Element[] =>
  datasets.map((dataset) => (
    <MenuItem
      key={dataset.id}
      onClick={() => {
        onDatasetSelected(dataset);
      }}
      text={dataset.name}
    />
  ));

/**
 * Dataset menu, toggled from dataset name in app-level breadcrumbs.
 */
const DatasetMenu = React.memo<Props>(
  ({ children, datasets, onDatasetSelected }): JSX.Element => (
    <Popover
      boundary="viewport"
      content={
        <Menu
          style={{
            maxHeight:
              "290px" /* show 9.5 datasets at 30px height each, plus top padding of 5px */,
            maxWidth: "680px",
            overflow: "auto",
          }}
        >
          {buildDatasetMenuItems(datasets, onDatasetSelected)}
        </Menu>
      }
      hasBackdrop
      minimal
      modifiers={{ offset: { offset: "0, 10" } }}
      position={Position.BOTTOM_LEFT}
      targetClassName={styles.datasetSelectorMenuPopoverTarget}
    >
      {children}
    </Popover>
  )
);
export default DatasetMenu;
