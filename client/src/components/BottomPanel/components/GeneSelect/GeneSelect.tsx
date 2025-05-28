import { MenuItem } from "@blueprintjs/core";
import React, { useState, useEffect, useRef } from "react";
import fuzzysort from "fuzzysort";
import { ItemRenderer, Select } from "@blueprintjs/select";
import { useSelector } from "react-redux";
import { useChromatinViewerSelectedGene } from "common/queries/useChromatinViewerSelectedGene";

import { Dataframe } from "util/dataframe";
import {
  FuzzySortResult,
  Item,
  RenderItemProps,
} from "components/RightSideBar/components/GeneExpression/components/InfoPanel/components/InfoPanelContainer/components/InfoSearch/types";
import { BottomPanelButton } from "components/BottomPanel/style";
import { SelectedGenePrefix } from "./style";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function GeneSelect() {
  const { selectedGene, setSelectedGene } = useChromatinViewerSelectedGene();

  const [geneNames, setGeneNames] = useState([] as string[]);
  const [, setStatus] = useState("pending");

  const { annoMatrix } = useSelector((state) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    annoMatrix: (state as any).annoMatrix,
  }));

  const prevProps = usePrevious({ annoMatrix });

  useEffect(() => {
    if (!annoMatrix) return;
    (async function fetch() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on commit
      if (annoMatrix !== (prevProps as any)?.annoMatrix) {
        const { schema } = annoMatrix;
        const varIndex = schema.annotations.var.index;

        setStatus("pending");
        try {
          const df: Dataframe = await annoMatrix.fetch("var", varIndex);
          const isFilteredCol = "feature_is_filtered";
          const isFiltered =
            annoMatrix.getMatrixColumns("var").includes(isFilteredCol) &&
            (await annoMatrix.fetch("var", isFilteredCol));

          setStatus("success");

          if (isFiltered) {
            const isFilteredArray = isFiltered.col(isFilteredCol).asArray();
            setGeneNames(
              df
                .col(varIndex)
                .asArray()
                .filter((_, index) => !isFilteredArray[index] && _) as string[]
            );
          } else {
            setGeneNames(df.col(varIndex).asArray() as string[]);
          }
        } catch (error) {
          setStatus("error");
          throw error;
        }
      }
    })();
  }, [annoMatrix, prevProps]);

  const renderGene: ItemRenderer<string | FuzzySortResult> = (
    item: string | FuzzySortResult,
    { modifiers }: RenderItemProps
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    const geneName = typeof item === "string" ? item : item.target;

    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        data-testid={`suggest-menu-item-${geneName}`}
        key={geneName}
        onClick={() => {
          handleClick(item);
        }}
        text={geneName}
      />
    );
  };

  const handleClick = (g: Item) => {
    if (!g) return;
    const item = typeof g === "string" ? g : g.target;
    const gene = item;
    setSelectedGene(gene);
  };

  const filterGenes = (query: string, genes: string[]) => {
    console.log("filter genes", query);
    /* fires on load, once, and then for each character typed into the input */
    return fuzzysort.go(query, genes, {
      limit: 20,
      threshold: -10000,
    });
  };

  return (
    <div data-testid="gene-search">
      <Select<string>
        items={geneNames || ["No genes"]}
        itemListPredicate={(query: string, items: string[]) => {
          if (!query) {
            return [...items].sort((a, b) => a.localeCompare(b)).slice(0, 20);
          }
          return filterGenes(query, items) as unknown as string[];
        }}
        itemRenderer={renderGene as ItemRenderer<string>}
        noResults={<MenuItem disabled text="No matching genes." />}
        onItemSelect={(g) => {
          handleClick(g);
        }}
        popoverProps={{ minimal: true }}
        placeholder="Search"
      >
        <BottomPanelButton
          active={false}
          data-testid="select-gene"
          minimal
          text={
            selectedGene ? (
              <span>
                <SelectedGenePrefix>Gene:</SelectedGenePrefix>
                {`${selectedGene}`}
              </span>
            ) : (
              "Select a gene..."
            )
          }
          rightIcon="chevron-down"
        />
      </Select>
    </div>
  );
}
