const truncate: { [key: string]: string } = {};
const truncateLabels = [];
for (let i = 0; i < 999; i += 1) {
  truncateLabels.push(`CellType${i}`);
}
truncateLabels.push(`CellType1100`);
truncateLabels.sort();
truncateLabels.push("truncate: all other labels");
for (let i = 0; i < truncateLabels.length; i += 1) {
  truncate[truncateLabels[i]] = "1";
}
truncate.CellType1100 = "400";
truncate["truncate: all other labels"] = "101";

export const datasets = {
  "pbmc3k.cxg": {
    title: "pbmc3k.cxg",
    dataframe: {
      nObs: "2638",
      nVar: "1838",
      type: "float32",
    },
    categorical: {
      louvain: {
        "B cells": "342",
        "CD14+ Monocytes": "480",
        "CD4 T cells": "1144",
        "CD8 T cells": "316",
        "Dendritic cells": "37",
        "FCGR3A+ Monocytes": "150",
        Megakaryocytes: "15",
        "NK cells": "154",
      },
    },
    continuous: {
      n_genes: "int32",
      percent_mito: "float32",
      n_counts: "float32",
    },
    cellsets: {
      lasso: [
        {
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.75 },
          count: "1102",
          count_side: "1211",
        },
      ],
      invalidLasso: [
        {
          /**
           * (thuang): This creates a straight line along x, which is an invalid lasso.
           */
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.25 },
          count: "2638",
        },
      ],
      categorical: [
        {
          metadata: "louvain",
          values: ["B cells", "Megakaryocytes"],
          count: "357",
        },
      ],
      continuous: [
        {
          metadata: "n_genes",
          "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
          count: "1537",
        },
      ],
    },
    diffexp: {
      category: "louvain",
      cellset1: {
        cellType: "B cells",
      },
      cellset2: {
        cellType: "NK cells",
      },
      pop2Gene: "NKG7",
    },
    genes: {
      bulkadd: ["S100A8", "FCGR3A", "LGALS2", "GSTP1"],
      search: "ACD",
    },
    subset: {
      cellset1: [
        {
          kind: "categorical",
          metadata: "louvain",
          values: ["B cells", "Megakaryocytes"],
        },
      ],
      count: "332",
      categorical: {
        louvain: {
          "B cells": "342",
          Megakaryocytes: "15",
        },
      },
      lasso: {
        "coordinates-as-percent": { x1: 0.25, y1: 0.1, x2: 0.75, y2: 0.65 },
        count: "329",
      },
    },
    scatter: {
      genes: { x: "S100A8", y: "FCGR3A" },
    },
    pan: {
      "coordinates-as-percent": { x1: 0.75, y1: 0.75, x2: 0.25, y2: 0.25 },
    },
    features: {
      panzoom: {
        lasso: {
          "coordinates-as-percent": { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
          count: "38",
          count_side: "45",
        },
      },
    },
    categoryLabel: {
      lasso: {
        "coordinates-as-percent": { x1: 0.05, y1: 0.3, x2: 0.5, y2: 0.5 },
      },
      newCount: {
        bySubsetConfig: {
          false: "668",
          true: "659",
        },
      },
    },
    annotationsFromFile: {
      count: {
        bySubsetConfig: {
          false: "1161",
          true: "852",
        },
      },
    },
    clip: {
      min: "30",
      max: "70",
      metadata: "n_genes",
      gene: "S100A8",
      "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
      count: "386",
      "gene-cell-count": "416",
    },
    brushOnGenesetMean: {
      default: "131",
      withSubset: "113",
    },
    expandGeneAndBrush: {
      default: "109",
      withSubset: "96",
    },
    embeddingChoice: {
      original: "umap",
      somethingElse: "pca",
    },
    /**
     * (thuang): Unused, since homeButton is only available on spatial datasets.
     * However, it's included here to satisfy the type checker.
     */
    homeButton: {
      pan: {
        "coordinates-as-percent": { x1: 0, y1: 0, x2: 0, y2: 0 },
      },
    },
  },
  "super-cool-spatial.cxg": {
    title: "super-cool-spatial.cxg",
    dataframe: {
      nObs: "2881",
      nVar: "1838",
      type: "float32",
    },
    categorical: {
      cell_type: {
        "B cell": "1",
        "CD14-low, CD16-positive monocyte": "2",
        "CD14-positive monocyte": "1",
        "CD8-positive, alpha-beta cytotoxic T cell": "8",
        "activated CD4-positive, alpha-beta T cell": "1",
        adipocyte: "76",
        "cardiac pacemaker cell of sinoatrial node": "100",
        "dendritic cell, human": "7",
        "endocardial cell": "31",
        "endothelial cell": "15",
        "endothelial cell of artery": "14",
        "endothelial cell of lymphatic vessel": "2",
        "fibroblast of cardiac tissue": "842",
        "glial cell": "43",
        macrophage: "72",
        "mast cell": "19",
        monocyte: "9",
        "mucosal invariant T cell": "5",
        "naive thymus-derived CD4-positive, alpha-beta T cell": "24",
        neutrophil: "8",
        pericyte: "6",
        "plasma cell": "1",
        "regular atrial cardiac myocyte": "1499",
        "smooth muscle cell": "33",
        "smooth muscle cell of the pulmonary artery": "12",
        "vein endothelial cell": "50",
      },
    },
    continuous: {
      n_genes_by_counts: "int32",
    },
    cellsets: {
      lasso: [
        {
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.75 },
          count: "2320",
          count_side: "1775",
        },
      ],
      invalidLasso: [
        {
          /**
           * (thuang): This creates a straight line along x, which is an invalid lasso.
           */
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.25 },
          count: "2881",
        },
      ],
      categorical: [
        {
          metadata: "cell_type",
          values: ["B cell", "glial cell"],
          count: "44", // B cell 1 + glial cell 43
        },
      ],
      continuous: [
        {
          metadata: "n_genes_by_counts",
          "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
          count: "1081",
        },
      ],
    },

    diffexp: {
      category: "cell_type",
      cellset1: {
        cellType: "B cell",
      },
      cellset2: {
        cellType: "glial cell",
      },
      pop2Gene: "RACK1",
    },

    genes: {
      bulkadd: ["S100A8", "FCGR3A", "LGALS2", "GSTP1"],
      search: "ACD",
    },
    subset: {
      cellset1: [
        {
          kind: "categorical",
          metadata: "cell_type",
          values: ["glial cell", "B cell"],
        },
      ],
      count: "332",
      categorical: {
        cell_type: {
          "B cell": "1",
          "glial cell": "43",
        },
      },
      lasso: {
        "coordinates-as-percent": { x1: 0.25, y1: 0.1, x2: 0.75, y2: 0.65 },
        count: "27",
      },
    },
    scatter: {
      genes: { x: "S100A8", y: "FCGR3A" },
    },
    pan: {
      "coordinates-as-percent": { x1: 0.75, y1: 0.75, x2: 0.25, y2: 0.25 },
    },
    features: {
      panzoom: {
        lasso: {
          "coordinates-as-percent": { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
          count: "221",
          count_side: "221",
        },
      },
    },
    categoryLabel: {
      lasso: {
        "coordinates-as-percent": { x1: 0.05, y1: 0.3, x2: 0.5, y2: 0.5 },
      },
      newCount: {
        bySubsetConfig: {
          false: "668",
          true: "659",
        },
      },
    },
    annotationsFromFile: {
      count: {
        bySubsetConfig: {
          false: "1161",
          true: "852",
        },
      },
    },
    clip: {
      min: "30",
      max: "70",
      metadata: "n_genes_by_counts",
      gene: "S100A8",
      "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
      count: "338",
      "gene-cell-count": "416",
    },
    brushOnGenesetMean: {
      default: "74",
      withSubset: "67",
    },
    expandGeneAndBrush: {
      default: "52",
      withSubset: "47",
    },
    embeddingChoice: {
      original: "spatial",
      somethingElse: "prop",
    },
    homeButton: {
      pan: {
        "coordinates-as-percent": { x1: 0.75, y1: 0.75, x2: 0.2, y2: 0.2 },
      },
    },
  },
};
