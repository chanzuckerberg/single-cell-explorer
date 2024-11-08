import React from "react";
import { Button, Dialog, Classes, Colors, Tooltip } from "@blueprintjs/core";
import { AnnoDialogProps } from "./types";
import { DialogForm, DialogWrapper, SecondaryText } from "./style";

export function AnnoDialog(props: AnnoDialogProps): JSX.Element {
  const {
    isActive,
    text,
    title,
    instruction,
    cancelTooltipContent,
    errorMessage,
    validationError,
    annoSelect,
    annoInput,
    secondaryInstructions,
    secondaryInput,
    handleCancel,
    handleSubmit,
    primaryButtonText,
    secondaryButtonText,
    handleSecondaryButtonSubmit,
    primaryButtonProps,
  } = props;

  return (
    <Dialog icon="tag" title={title} isOpen={isActive} onClose={handleCancel}>
      <DialogForm
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className={Classes.DIALOG_BODY}>
          <DialogWrapper style={{ marginBottom: 20 }}>
            <p>{instruction}</p>
            {annoInput || null}
            <p
              style={{
                marginTop: 7,
                visibility: validationError ? "visible" : "hidden",
                color: Colors.ORANGE3,
              }}
            >
              {errorMessage}
            </p>
            {/* we might rename, secondary button and secondary input are not related */}
            {secondaryInstructions && (
              <SecondaryText secondaryInstructions={secondaryInstructions}>
                {secondaryInstructions}
              </SecondaryText>
            )}
            {secondaryInput || null}
          </DialogWrapper>
          {annoSelect || null}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Tooltip content={cancelTooltipContent}>
              <Button onClick={handleCancel}>Cancel</Button>
            </Tooltip>
            {/* we might rename, secondary button and secondary input are not related */}
            {handleSecondaryButtonSubmit && secondaryButtonText ? (
              <Button
                onClick={handleSecondaryButtonSubmit}
                disabled={!text || validationError}
                intent="none"
                type="button"
              >
                {secondaryButtonText}
              </Button>
            ) : null}
            <Button
              {...primaryButtonProps} // Spreading props allows for modularity
              onClick={handleSubmit}
              disabled={!text || validationError}
              intent="primary"
              type="submit"
            >
              {primaryButtonText}
            </Button>
          </div>
        </div>
      </DialogForm>
    </Dialog>
  );
}
