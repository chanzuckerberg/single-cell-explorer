/* Core dependencies */
import { Colors, Menu, MenuItem, Popover, Position } from "@blueprintjs/core";
import React, { useState } from "react";

/* App dependencies */
import { IconNames } from "../icon";
import Icon from "../icon/icon";

/**
 * Documentation and roadmap menu, toggled from the FAB.
 */
function FloatingButton(): JSX.Element {
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  return (
    <Popover
      content={
        <Menu>
          <MenuItem
            href="https://docs.cellxgene.cziscience.com/"
            rel="noopener"
            target="_blank"
            text="Documentation"
          />
          <MenuItem
            href="https://docs.cellxgene.cziscience.com/explore-data/the-exploration-interface"
            rel="noopener"
            target="_blank"
            text="Our Roadmap"
          />
        </Menu>
      }
      hasBackdrop
      isOpen={helpMenuOpen}
      minimal
      modifiers={{ offset: { offset: "0, 4" } }}
      onClose={() => setHelpMenuOpen(false)}
      position={Position.TOP_RIGHT}
      target={
        <button
          onClick={() => setHelpMenuOpen(true)}
          style={{
            alignItems: "center",
            backgroundColor: Colors.DARK_GRAY1,
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            flex: 1,
            height: 32,
            justifyContent: "center",
            width: 32,
          }}
          type="button"
        >
          <Icon icon={IconNames.HELP} />
        </button>
      }
      targetProps={{
        style: {
          bottom: 32,
          position: "absolute",
          right: 8,
          zIndex: 3, // Similar to datasetSelector
        },
      }}
    />
  );
}

export default FloatingButton;
