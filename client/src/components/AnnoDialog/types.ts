import { MouseEvent, SyntheticEvent } from "react";

export interface AnnoDialogProps {
  isActive: boolean;
  text: string;
  title: string;
  instruction: string;
  cancelTooltipContent: string;
  errorMessage?: string;
  validationError: boolean;
  annoSelect?: JSX.Element | null;
  annoInput: JSX.Element | null;
  secondaryInstructions?: string;
  secondaryInput?: JSX.Element | null;
  handleCancel: (e: SyntheticEvent<HTMLElement, Event>) => void;
  handleSubmit: (e: MouseEvent<HTMLElement>) => void;
  primaryButtonText: string;
  secondaryButtonText?: string;
  handleSecondaryButtonSubmit?: () => void;
  primaryButtonProps: Record<string, unknown>;
}
