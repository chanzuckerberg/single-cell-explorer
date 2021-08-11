/* Core dependencies */
import { Menu, MenuItem, Popover, Position } from "@blueprintjs/core";
import React from "react";

/* App dependencies */
import { TruncatingBreadcrumbMenuItemProps } from "./truncatingBreadcrumbs";

/* Styles */
// @ts-expect-error --- TODO fix import
import styles from "./datasetSelector.css";

interface Props {
  children: React.ReactNode;
  items: TruncatingBreadcrumbMenuItemProps[];
}

/*
 Build menu item elements from given array of menu item props.
 @param items - Set of menu item props to display as menu item.
 @returns Array of MenuItem elements.
   */
const buildDatasetMenuItems = (
  items: TruncatingBreadcrumbMenuItemProps[]
): JSX.Element[] =>
  items.map((item) => (
    <MenuItem key={item.key} onClick={item.onClick} text={item.text} />
  ));

/*
 Dataset menu, toggled from dataset name in app-level breadcrumbs.
 */
const DatasetMenu = React.memo<Props>(
  ({ children, items }): JSX.Element => (
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
          {buildDatasetMenuItems(items)}
        </Menu>
      }
      hasBackdrop
      minimal
      modifiers={{ offset: { offset: "0, 10" } }}
      popoverClassName={styles.datasetPopover}
      position={Position.BOTTOM_LEFT}
      targetClassName={styles.datasetPopoverTarget}
    >
      {children}
    </Popover>
  )
);
export default DatasetMenu;
