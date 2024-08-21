import React, { useCallback } from "react";
import { Button, MenuItem } from "@blueprintjs/core";
import { Select, ItemRenderer, ItemRendererProps } from "@blueprintjs/select";

type Props = {
  allCategoryNames: string[];
  categoryToDuplicate: string | null;
  handleModalDuplicateCategorySelection: (item: string) => void;
};

function DuplicateCategorySelect(props: Props) {
  const {
    allCategoryNames,
    categoryToDuplicate,
    handleModalDuplicateCategorySelection,
  } = props;

  const itemRenderer: ItemRenderer<string> = useCallback(
    (item: string, { handleClick, modifiers }: ItemRendererProps) => (
      <MenuItem
        data-testid="duplicate-category-dropdown-option"
        onClick={handleClick}
        key={item}
        text={item}
        active={modifiers.active}
        disabled={modifiers.disabled}
      />
    ),
    []
  );

  const onItemSelect = useCallback(
    (item: string) => {
      handleModalDuplicateCategorySelection(item);
    },
    [handleModalDuplicateCategorySelection]
  );

  return (
    <div>
      <p>
        Optionally duplicate all labels & cell assignments from existing
        category into new category:
      </p>
      <Select
        items={allCategoryNames || []}
        filterable={false}
        itemRenderer={itemRenderer}
        noResults={<MenuItem disabled text="No results." />}
        onItemSelect={onItemSelect}
      >
        <Button
          data-testid="duplicate-category-dropdown"
          text={categoryToDuplicate || "None (all cells 'unassigned')"}
          rightIcon="double-caret-vertical"
        />
      </Select>
    </div>
  );
}

export default DuplicateCategorySelect;
