import { H4, Icon, MenuItem } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { useState, useEffect, useRef, useMemo } from "react";
import fuzzysort from "fuzzysort";
import { ItemRenderer, Suggest } from "@blueprintjs/select";
import { useSelector, useDispatch } from "react-redux";

import { noop } from "lodash";
import Gene from "./gene";

import { postUserErrorToast } from "../framework/toasters";
import actions from "../../actions";
import { Dataframe, DataframeValue } from "../../util/dataframe";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { FuzzySortResult, Item, RenderItemProps } from "./infoSearch/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

function QuickGene() {
  const dispatch = useDispatch();

  const [isExpanded, setIsExpanded] = useState(true);
  const [geneNames, setGeneNames] = useState([] as string[]);
  const [geneIds, setGeneIds] = useState([] as DataframeValue[]);
  const [, setStatus] = useState("pending");

  const { annoMatrix, userDefinedGenes, userDefinedGenesLoading } = useSelector(
    (state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      annoMatrix: (state as any).annoMatrix,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      userDefinedGenes: (state as any).quickGenes.userDefinedGenes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      userDefinedGenesLoading: (state as any).quickGenes
        .userDefinedGenesLoading,
    })
  );

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
          let dfIds: Dataframe;
          const geneIdCol = "feature_id";
          const isFilteredCol = "feature_is_filtered";
          const isFiltered =
            annoMatrix.getMatrixColumns("var").includes(isFilteredCol) &&
            (await annoMatrix.fetch("var", isFilteredCol));

          // if feature id column is available in var
          if (annoMatrix.getMatrixColumns("var").includes(geneIdCol)) {
            dfIds = await annoMatrix.fetch("var", geneIdCol);
            setGeneIds(dfIds.col("feature_id").asArray() as DataframeValue[]);
          }

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

  useEffect(() => {
    dispatch({ type: "request gene list success", geneNames });
  }, [dispatch, geneNames]);

  const handleExpand = () => setIsExpanded(!isExpanded);

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
    if (userDefinedGenes.indexOf(gene) !== -1) {
      postUserErrorToast("That gene already exists");
    } else if (geneNames.indexOf(gene) === undefined) {
      postUserErrorToast("That doesn't appear to be a valid gene name.");
    } else {
      track(EVENTS.EXPLORER_ADD_GENE);
      dispatch({ type: "single user defined gene start" });
      dispatch(actions.requestUserDefinedGene(gene));
      dispatch({ type: "single user defined gene complete" });
    }
  };

  const filterGenes = (query: string, genes: string[]) =>
    /* fires on load, once, and then for each character typed into the input */
    fuzzysort.go(query, genes, {
      limit: 5,
      threshold: -10000,
    });

  const QuickGenes = useMemo((): JSX.Element => {
    const removeGene = (gene: string) => () => {
      dispatch({ type: "clear user defined gene", gene });
    };

    return userDefinedGenes.map((gene: string) => {
      let geneId = geneIds[geneNames.indexOf(gene)];
      if (!geneId) {
        geneId = "";
      }

      return (
        <Gene
          key={`quick=${gene}`}
          gene={gene}
          removeGene={removeGene}
          quickGene
          geneId={geneId}
          isGeneExpressionComplete
          onGeneExpressionComplete={noop}
        />
      );
    });
  }, [userDefinedGenes, geneNames, geneIds, dispatch]);

  return (
    <div style={{ width: "100%", marginBottom: "16px" }}>
      <H4
        role="menuitem"
        tabIndex={0}
        data-testid="quickgene-heading-expand"
        onKeyPress={handleExpand}
        style={{
          cursor: "pointer",
        }}
        onClick={handleExpand}
      >
        Genes{" "}
        {isExpanded ? (
          <Icon icon={IconNames.CHEVRON_DOWN} />
        ) : (
          <Icon icon={IconNames.CHEVRON_RIGHT} />
        )}
      </H4>
      {isExpanded && (
        <>
          <div style={{ marginBottom: "8px" }} data-testid="gene-search">
            <Suggest
              resetOnSelect
              closeOnSelect
              resetOnClose
              itemDisabled={userDefinedGenesLoading ? () => true : () => false}
              noResults={<MenuItem disabled text="No matching genes." />}
              onItemSelect={(g) => {
                handleClick(g);
              }}
              initialContent={<MenuItem disabled text="Enter a gene…" />}
              inputProps={{
                placeholder: "Quick Gene Search",
                leftIcon: IconNames.SEARCH,
              }}
              inputValueRenderer={() => ""}
              itemListPredicate={(query: string, items: string[]) =>
                filterGenes(query, items) as unknown as string[]
              }
              itemRenderer={renderGene as ItemRenderer<string>}
              items={geneNames || ["No genes"]}
              popoverProps={{ minimal: true }}
              fill
            />
          </div>
          {QuickGenes}
        </>
      )}
    </div>
  );
}

export default QuickGene;
