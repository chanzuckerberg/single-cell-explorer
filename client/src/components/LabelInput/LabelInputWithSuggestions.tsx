import React from "react";
import { useCellTypeSuggestions } from "common/hooks/useCellTypeSuggestions";
import { LabelInput } from "./LabelInput";

interface LabelInputWithSuggestionsProps {
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  inputProps?: Record<string, unknown>;
  label?: string;
}

export function LabelInputWithSuggestions({
  onChange,
  onSelect,
  inputProps,
  label,
}: LabelInputWithSuggestionsProps) {
  const cellTypeSuggestions = useCellTypeSuggestions();

  const handleSelect = (value: string) => {
    // When user selects from dropdown, update the state
    onChange(value);
    // Also call the optional onSelect prop if provided
    onSelect?.(value);
  };

  return (
    <LabelInput
      label={label}
      labelSuggestions={cellTypeSuggestions}
      onChange={onChange}
      onSelect={handleSelect}
      inputProps={inputProps}
    />
  );
}
