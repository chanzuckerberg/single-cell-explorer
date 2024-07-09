/* Core dependencies */
import React, { useState, useEffect } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { Link } from "../geneExpression/infoPanel/geneInfo/style";

interface Props {
  triggerOpen: boolean | null;
}

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
    <Snackbar
      open={open}
      autoHideDuration={60000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      sx={{ width: "423px" }}
      ClickAwayListenerProps={{ onClickAway: undefined }}
    >
      <MuiAlert
        onClose={handleClose}
        severity="info"
        sx={{
          width: "100%",
          fontSize: "13px",
          fontFamily: "Inter",
          fontWeight: 400,
          lineHeight: "20px",
        }}
      >
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
      </MuiAlert>
    </Snackbar>
  );
}

export default DiffexNotice;
