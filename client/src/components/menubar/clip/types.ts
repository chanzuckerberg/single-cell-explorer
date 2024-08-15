export interface ClipProps {
  pendingClipPercentiles: ClipState;
  clipPercentileMin: number;
  clipPercentileMax: number;
  handleClipOpening: () => void;
  handleClipClosing: () => void;
  handleClipCommit: () => void;
  isClipDisabled: () => boolean;
  handleClipOnKeyPress: (e: KeyboardEvent) => void;
  handleClipPercentileMaxValueChange: (value: number) => void;
  handleClipPercentileMinValueChange: (value: number) => void;
}

export interface ClipState {
  clipPercentileMin: number;
  clipPercentileMax: number;
}
