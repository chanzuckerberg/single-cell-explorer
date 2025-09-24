import React from "react";
import { InputGroup, MenuItem } from "@blueprintjs/core";
import type { InputGroupProps2 } from "@blueprintjs/core";
import { Suggest } from "@blueprintjs/select";
import type { ItemRendererProps, SuggestProps } from "@blueprintjs/select";
import fuzzysort from "fuzzysort";

interface LabelInputProps {
  labelSuggestions?: string[] | null;
  label?: string;
  onSelect?: (value: string, event?: React.SyntheticEvent<HTMLElement>) => void;
  onChange?: (value: string, event?: React.SyntheticEvent<HTMLElement>) => void;
  newLabelMessage?: string;
  inputProps?: Record<string, unknown>;
  popoverProps?: SuggestProps<SuggestItem>["popoverProps"];
  autoFocus?: boolean;
}

interface LabelInputState {
  query: string;
  queryResults: SuggestItem[];
}

interface SuggestItem {
  target: string;
  score: number;
  indexes: number[];
  newLabel?: boolean;
}

export class LabelInput extends React.PureComponent<
  LabelInputProps,
  LabelInputState
> {
  static QueryResultLimit = 100;

  constructor(props: LabelInputProps) {
    super(props);
    const query = props.label ?? "";
    this.state = {
      query,
      queryResults: this.filterLabels(query),
    };
  }

  handleQueryChange = (
    query: string,
    event?: React.SyntheticEvent<HTMLElement>
  ) => {
    if (!event) return;
    const queryResults = this.filterLabels(query);
    this.setState({ query, queryResults });
    const { onChange } = this.props;
    if (onChange) onChange(query, event);
  };

  handleItemSelect = (
    item: SuggestItem,
    event?: React.SyntheticEvent<HTMLElement>
  ) => {
    const { query } = this.state;
    const { onSelect } = this.props;
    if (item.target !== query && onSelect) onSelect(item.target, event);
  };

  handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
    }
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange } = this.props;
    if (onChange) onChange(event.target.value, event);
  };

  renderLabelSuggestion = (
    item: SuggestItem,
    { handleClick, modifiers }: ItemRendererProps<SuggestItem>
  ) => {
    const { newLabelMessage } = this.props;
    if (item.newLabel) {
      return (
        <MenuItem
          icon="flag"
          active={modifiers.active}
          disabled={modifiers.disabled}
          key={item.target}
          onClick={handleClick}
          text={<em>{item.target}</em>}
          label={newLabelMessage || "New label"}
        />
      );
    }
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        key={item.target}
        onClick={handleClick}
        text={item.target}
      />
    );
  };

  filterLabels(query: string): SuggestItem[] {
    const { labelSuggestions } = this.props;
    if (!labelSuggestions || labelSuggestions.length === 0) return [];

    if (query === "") {
      return labelSuggestions
        .slice(0, LabelInput.QueryResultLimit)
        .map((target) => ({ target, score: -10000 }));
    }

    const options = {
      limit: LabelInput.QueryResultLimit,
      threshold: -10000,
    };
    const fuzzyResults = fuzzysort.go(query, labelSuggestions, options);
    const normalized: SuggestItem[] = Array.from(fuzzyResults).map((result) => ({
      target: result.target,
      score: result.score,
      indexes: result.indexes,
    }));
    if (query !== "" && normalized[0]?.target !== query) {
      normalized.unshift({ target: query, score: 0, indexes: [], newLabel: true });
    }
    return normalized;
  }

  render(): JSX.Element {
    const {
      labelSuggestions,
      label,
      autoFocus = true,
      inputProps,
      popoverProps,
    } = this.props;
    const { queryResults, query } = this.state;
    const hasSuggestions = Boolean(labelSuggestions && labelSuggestions.length);

    if (!hasSuggestions) {
      return (
        <InputGroup
          autoFocus={autoFocus}
          {...((inputProps as InputGroupProps2) ?? {})}
          value={label}
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
        />
      );
    }

    const mergedPopoverProps = {
      minimal: true,
      ...(popoverProps ?? {}),
    };
    const mergedInputProps = {
      ...(inputProps ?? {}),
      autoFocus: false,
      onKeyDown: this.handleKeyDown,
    } as InputGroupProps2;

    return (
      <Suggest<SuggestItem>
        fill
        inputValueRenderer={(item) => item.target}
        items={queryResults}
        itemRenderer={this.renderLabelSuggestion}
        onItemSelect={this.handleItemSelect}
        query={query}
        onQueryChange={this.handleQueryChange}
        popoverProps={mergedPopoverProps}
        inputProps={mergedInputProps}
      />
    );
  }
}
