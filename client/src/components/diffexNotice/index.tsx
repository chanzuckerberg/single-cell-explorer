/* Core dependencies */
import React, { useState, useEffect } from "react";
import { noop } from "lodash";
import { Link } from "../geneExpression/infoPanel/common/style";
import { StyledSnackbar, StyledAlert } from "./style";

interface Props {
  triggerOpen: boolean | null;
}

const ClickAwayListenerProps = {
  onClickAway: noop,
};

function DiffexNotice(props: Props): JSX.Element {
  const { triggerOpen } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!triggerOpen) return;
    const lastClosed = localStorage.getItem("diffexNoticeClosed");
    let shouldShow = true;
    if (lastClosed) {
      const lastClosedDate = new Date(lastClosed);
      const now = new Date();
      const diffInDays =
        (now.getTime() - lastClosedDate.getTime()) / (1000 * 3600 * 24);
      if (diffInDays < 30) {
        shouldShow = false;
      }
    }
    setOpen(shouldShow);
  }, [triggerOpen]);

  const handleClose = () => {
    localStorage.setItem("diffexNoticeClosed", new Date().toISOString());
    setOpen(false);
  };

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={60000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      ClickAwayListenerProps={ClickAwayListenerProps}
    >
      <StyledAlert onClose={handleClose} severity="info">
        <p style={{ marginBottom: "16px" }}>
          To find differentially expressed genes using all data in the CZ
          CELLxGENE Discover Census, use the Differential Expression Tool.
        </p>
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href="https://cellxgene.cziscience.com/differential-expression"
          onClick={handleClose}
          style={{ fontWeight: 500, color: "#0073FF" }}
        >
          Open Differential Expression Tool
        </Link>
      </StyledAlert>
    </StyledSnackbar>
  );
}

export default DiffexNotice;
