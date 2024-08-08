/* Core dependencies */
import { Colors, Menu, MenuItem, Position } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import React, { useState } from "react";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";

/* App dependencies */
import { IconNames } from "../icon";
import Icon from "../icon/icon";

interface Props {
  baseUrl: string;
}

/**
 * Documentation and roadmap menu, toggled from the FAB.
 */
function FloatingButton(props: Props): JSX.Element {
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  function handleHelpMenuClick() {
    track(EVENTS.EXPLORER_FLOATING_BUTTON_CLICKED);
    setHelpMenuOpen(true);
  }

  const { baseUrl } = props;

  return (
    <Popover2
      content={
        <Menu>
          <MenuItem
            href={`${baseUrl}/docs`}
            rel="noopener"
            target="_blank"
            text="Documentation"
          />
          <MenuItem
            href={`${baseUrl}/docs/04__Analyze%20Public%20Data/4_1__Hosted%20Tutorials`}
            rel="noopener"
            target="_blank"
            text="Tutorials"
          />
        </Menu>
      }
      hasBackdrop
      isOpen={helpMenuOpen}
      minimal
      modifiers={{ offset: { enabled: true, options: { offset: [0, 10] } } }}
      onClose={() => setHelpMenuOpen(false)}
      position={Position.TOP_RIGHT}
      renderTarget={() => (
        <button
          onClick={handleHelpMenuClick}
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
          data-testid="floating-button"
        >
          <Icon icon={IconNames.HELP} />
        </button>
      )}
      targetProps={{
        style: {
          bottom: 8,
          position: "absolute",
          right: 8,
          zIndex: 3, // Similar to datasetSelector
        },
      }}
    />
  );
}

export default FloatingButton;
