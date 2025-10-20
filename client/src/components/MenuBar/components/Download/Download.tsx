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
  const [isDownloadingCategories, setIsDownloadingCategories] = useState(false);
  const [isDownloadingGeneSets, setIsDownloadingGeneSets] = useState(false);

  const handleCurrentViewDownload = () => {
    dispatch({ type: "graph: screencap start" });
    setIsOpen(false);
  };

  const handleCategoriesDownload = async () => {
    setIsDownloadingCategories(true);
    try {
      await exportCategoriesCSV(annoMatrix, schema);
      track(EVENTS.EXPLORER_DOWNLOAD_CATEGORIES_CSV);
    } catch (error) {
      console.error("Failed to export categories CSV:", error);
    } finally {
      setIsDownloadingCategories(false);
    }
    setIsOpen(false);
  };

  const handleGeneSetsDownload = async () => {
    setIsDownloadingGeneSets(true);
    try {
      await exportGeneSetsCSV(genesets);
      track(EVENTS.EXPLORER_DOWNLOAD_GENESETS_CSV);
    } catch (error) {
      console.error("Failed to export gene sets CSV:", error);
    } finally {
      setIsDownloadingGeneSets(false);
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
        icon={isDownloadingCategories ? IconNames.REFRESH : IconNames.DOWNLOAD}
        text="Categories & label annotations (.csv)"
        onClick={handleCategoriesDownload}
        disabled={isDownloadingCategories}
      />
      <MenuItem
        icon={isDownloadingGeneSets ? IconNames.REFRESH : IconNames.DOWNLOAD}
        text="Gene set annotations (.csv)"
        onClick={handleGeneSetsDownload}
        disabled={isDownloadingGeneSets}
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
        loading={screenCap || isDownloadingCategories || isDownloadingGeneSets}
        data-testid="download-menu-button"
      />
    </Popover>
  );
};

export default Download;
