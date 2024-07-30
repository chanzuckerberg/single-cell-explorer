import React from "react";
import { MenuItem } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { Suggest, ItemRenderer } from "@blueprintjs/select";

import { FuzzySortResult, Props, RenderItemProps } from "./types";
import useConnect from "./connect";
import { InfoSearchWrapper } from "./styles";

function InfoSearch(props: Props) {
  const { infoType, isLoading, quickList } = props;

  const renderItem: ItemRenderer<string | FuzzySortResult> = (
    item: string | FuzzySortResult,
    { handleClick, modifiers }: RenderItemProps
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    const itemName = typeof item === "string" ? item : item.target;

    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        data-testid={`suggest-menu-item-${itemName}`}
        key={itemName}
        onClick={(g) => {
          handleClick(g);
        }}
        text={itemName}
      />
    );
  };
  const { handleClick, filterItems } = useConnect({ infoType });
  const infoTag = infoType === "Gene" ? "gene" : "cell-type";

  return (
    <InfoSearchWrapper data-testid={`suggest-menu-item-${infoTag}`}>
      <Suggest
        resetOnSelect
        closeOnSelect
        resetOnClose
        itemDisabled={isLoading ? () => true : () => false}
        noResults={<MenuItem disabled text="No matching genes." />}
        onItemSelect={(g) => {
          handleClick(g);
        }}
        inputProps={{
          placeholder: `Quick ${infoType} Search`,
          leftIcon: IconNames.SEARCH,
          fill: true,
        }}
        inputValueRenderer={() => ""}
        itemListPredicate={(query: string, items: string[]) =>
          filterItems(query, items) as unknown as string[]
        }
        itemRenderer={renderItem as ItemRenderer<string>}
        items={quickList || ["No items"]}
        popoverProps={{ minimal: true }}
        fill
      />
    </InfoSearchWrapper>
  );
}
export default InfoSearch;
