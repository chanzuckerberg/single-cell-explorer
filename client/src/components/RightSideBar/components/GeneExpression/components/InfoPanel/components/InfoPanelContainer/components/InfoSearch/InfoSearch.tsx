import React from "react";
import { connect } from "react-redux";

import { MenuItem } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { Suggest, ItemRenderer } from "@blueprintjs/select";

import {
  FuzzySortResult,
  Props,
  RenderItemProps,
  mapDispatchToProps,
} from "./types";
import useConnect from "./connect";
import { InfoSearchWrapper } from "./style";

function InfoSearch(props: Props) {
  const { infoType, isLoading, quickList, dispatch } = props;

  const renderItem: ItemRenderer<string | FuzzySortResult> = (
    item: string | FuzzySortResult,
    { modifiers }: RenderItemProps
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
        onClick={() => {
          handleClick(item);
        }}
        text={itemName}
      />
    );
  };
  const { handleClick, filterItems } = useConnect({ infoType, dispatch });
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
export default connect(mapDispatchToProps)(InfoSearch);
