import React from "react";
import { Button, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";

interface Props {
  allCategoryNames: string[];
  categoryToDuplicate: string | null;
  handleModalDuplicateCategorySelection: (categoryName: string) => void;
}

export function DuplicateCategorySelect({
  allCategoryNames,
  categoryToDuplicate,
  handleModalDuplicateCategorySelection,
}: Props): JSX.Element {
  return (
    <div>
      <p>
        Optionally duplicate all labels & cell assignments from existing
        category into new category:
      </p>
      <Select<string>
        items={allCategoryNames || []}
        filterable={false}
        itemRenderer={(categoryName, { handleClick }) => (
          <MenuItem
            data-testclass="duplicate-category-dropdown-option"
            onClick={handleClick}
            key={categoryName}
            text={categoryName}
          />
        )}
        noResults={<MenuItem disabled text="No results." />}
        onItemSelect={(categoryName) => {
          handleModalDuplicateCategorySelection(categoryName);
        }}
      >
        {/* children become the popover target; render value here */}
        <Button
          data-testid="duplicate-category-dropdown"
          text={categoryToDuplicate || "None (all cells 'unassigned')"}
          rightIcon="double-caret-vertical"
        />
      </Select>
    </div>
  );
}
