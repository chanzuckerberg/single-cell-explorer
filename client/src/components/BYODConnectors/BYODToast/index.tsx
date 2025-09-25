import React, { useState, useEffect } from "react";
import { Notification, Icon } from "@czi-sds/components";
import { StyledToast, StyledMessage, StyledButton } from "./style";
import { isToastDismissed, dismissToast } from "./utils";
import BYODModal from "../BYODModal";

const BYOD_TOAST_ID = "byod-ai-workspace";
const TOAST_MESSAGE =
  "Find this embedding useful? Upload your own single cell data and explore embeddings on CZI's AI Workspace.";
const TOAST_BUTTON_TEXT = "Learn more about AI Workspace";

export default function BYODToast(): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsVisible(!isToastDismissed(BYOD_TOAST_ID));
  }, []);

  const handleClose = () => {
    dismissToast(BYOD_TOAST_ID);
    setIsVisible(false);
  };

  const handleLinkClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <StyledToast>
        <Notification
          intent="info"
          slideDirection="left"
          onClose={handleClose}
          icon={<Icon sdsIcon="Rocket" sdsSize="s" sdsType="static" />}
        >
          <StyledMessage>{TOAST_MESSAGE}</StyledMessage>
          <StyledButton
            sdsType="primary"
            sdsStyle="minimal"
            onClick={handleLinkClick}
          >
            {TOAST_BUTTON_TEXT}
          </StyledButton>
        </Notification>
      </StyledToast>
      <BYODModal open={isModalOpen} onClose={handleModalClose} />
    </>
  );
}
