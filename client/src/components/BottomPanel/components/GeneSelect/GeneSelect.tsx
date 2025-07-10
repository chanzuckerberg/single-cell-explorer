import { MenuItem } from "@blueprintjs/core";
import React, { useState, useEffect, useRef, useMemo } from "react";
import fuzzysort from "fuzzysort";
import { ItemRenderer, Select } from "@blueprintjs/select";
import { useSelector } from "react-redux";
import { useChromatinViewerSelectedGene } from "common/hooks/useChromatinViewerSelectedGene";

import { Dataframe, DataframeValue } from "util/dataframe";
import {
  FuzzySortResult,
  Item,
  RenderItemProps,
} from "components/RightSideBar/components/GeneExpression/components/InfoPanel/components/InfoPanelContainer/components/InfoSearch/types";
import { BottomPanelButton } from "components/BottomPanel/style";
import { SelectedGenePrefix, SelectedGeneName } from "./style";

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
  const [geneIds, setGeneIds] = useState([] as DataframeValue[]);

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
        const varLabel = "feature_name";

        setStatus("pending");
        try {
          const dfIds: Dataframe = await annoMatrix.fetch("var", varIndex);
          const varColumns = annoMatrix.getMatrixColumns("var");

          // This is a fallback in case the varLabel is not available.
          const labelToUse = varColumns.includes(varLabel)
            ? varLabel
            : varIndex;
          const dfNames: Dataframe = await annoMatrix.fetch("var", labelToUse);

          const geneIdArray = dfIds.col(varIndex).asArray() as string[];
          const geneNameArray = dfNames.col(labelToUse).asArray() as string[];
          const isFilteredCol = "feature_is_filtered";
          const isFiltered =
            annoMatrix.getMatrixColumns("var").includes(isFilteredCol) &&
            (await annoMatrix.fetch("var", isFilteredCol));

          setStatus("success");

          if (isFiltered) {
            const isFilteredArray = isFiltered.col(isFilteredCol).asArray();

            const filteredGeneNames = geneNameArray.filter(
              (_, index) => !isFilteredArray[index] && _
            );
            const filteredGeneIds = geneIdArray.filter(
              (_, index) => !isFilteredArray[index] && _
            );
            setGeneNames(filteredGeneNames);
            setGeneIds(filteredGeneIds);
          } else {
            setGeneNames(geneNameArray);
            setGeneIds(geneIdArray);
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
  const geneItems = useMemo(() => {
    const EMPTY_GENE_ITEM = { name: "No genes", id: "" };
    if (!geneNames?.length || !geneIds?.length) {
      return [EMPTY_GENE_ITEM];
    }

    return geneNames.map((name, i) => ({
      name,
      id: String(geneIds[i] ?? ""),
    }));
  }, [geneNames, geneIds]);

  const handleClick = (g: Item) => {
    if (!g) return;
    const item = typeof g === "string" ? g : g.target;
    const gene = item;
    setSelectedGene(gene);
  };

  const filterGenes = (query: string, genes: string[]) =>
    /* fires on load, once, and then for each character typed into the input */
    fuzzysort.go(query, genes, {
      limit: 20,
      threshold: -10000,
    });
  return (
    <div data-testid="gene-search">
      <Select<string>
        items={geneItems.map((g) => g.name)}
        itemListPredicate={(query: string, items: string[]) => {
          const sortedItems = [...items].sort((a, b) => a.localeCompare(b));
          const selectedGeneIndex = sortedItems.indexOf(selectedGene);

          if (!query && selectedGeneIndex === -1) {
            return sortedItems.slice(0, 20);
          }
          if (!query) {
            const end = Math.min(items.length, selectedGeneIndex + 19);
            return sortedItems.slice(selectedGeneIndex, end);
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
              <SelectedGeneName>
                <SelectedGenePrefix>Gene:</SelectedGenePrefix>
                {`${selectedGene}`}
              </SelectedGeneName>
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
