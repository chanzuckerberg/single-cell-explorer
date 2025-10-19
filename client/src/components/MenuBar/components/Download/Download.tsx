import React, { useState } from "react";
import {
  Button,
  Popover,
  Menu,
  MenuItem,
  Tooltip,
  Position,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import {
  exportCategoriesCSV,
  exportGeneSetsCSV,
} from "../../../../util/csvExport";
import { track } from "../../../../analytics";
import { EVENTS } from "../../../../analytics/events";
import { DownloadProps } from "./types";

const Download: React.FC<DownloadProps> = ({
  screenCap,
  annoMatrix,
  genesets,
  schema,
  dispatch,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCurrentViewDownload = () => {
    dispatch({ type: "graph: screencap start" });
    setIsOpen(false);
  };

  const handleCategoriesDownload = async () => {
    try {
      await exportCategoriesCSV(annoMatrix, schema);
      track(EVENTS.EXPLORER_DOWNLOAD_CATEGORIES_CSV);
    } catch (error) {
      console.error("Failed to export categories CSV:", error);
    }
    setIsOpen(false);
  };

  const handleGeneSetsDownload = () => {
    try {
      exportGeneSetsCSV(genesets);
      track(EVENTS.EXPLORER_DOWNLOAD_GENESETS_CSV);
    } catch (error) {
      console.error("Failed to export gene sets CSV:", error);
    }
    setIsOpen(false);
  };

  const menu = (
    <Menu>
      <MenuItem
        icon={IconNames.CAMERA}
        text="Current view (.png)"
        onClick={handleCurrentViewDownload}
        disabled={screenCap}
      />
      <Tooltip
        content="This feature is not yet available"
        position={Position.RIGHT}
      >
        <MenuItem
          icon={IconNames.DOWNLOAD}
          text="Workflow-processed anndata (.h5ad)"
          disabled
        />
      </Tooltip>
      <MenuItem
        icon={IconNames.DOWNLOAD}
        text="Categories & label annotations (.csv)"
        onClick={handleCategoriesDownload}
      />
      <MenuItem
        icon={IconNames.DOWNLOAD}
        text="Gene set annotations (.csv)"
        onClick={handleGeneSetsDownload}
      />
    </Menu>
  );

  return (
    <Popover
      content={menu}
      isOpen={isOpen}
      onInteraction={setIsOpen}
      position={Position.BOTTOM}
      minimal
    >
      <Button
        icon={IconNames.DOWNLOAD}
        loading={screenCap}
        style={{ cursor: "pointer" }}
        data-testid="download-menu-button"
      />
    </Popover>
  );
};

export default Download;
