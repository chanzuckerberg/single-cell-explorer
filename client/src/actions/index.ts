import type { Config } from "../globals";
import * as globals from "../globals";
import { AnnoMatrixLoader, AnnoMatrixObsCrossfilter } from "../annoMatrix";
import {
  catchErrorsWrap,
  doJsonRequest,
  dispatchNetworkErrorMessageToUser,
} from "../util/actionHelpers";
import { loadUserColorConfig } from "../util/stateManager/colorHelpers";
import * as selnActions from "./selection";
import * as annoActions from "./annotation";
import * as viewActions from "./viewStack";
import * as embActions from "./embedding";
import * as genesetActions from "./geneset";
import { AppDispatch, GetState } from "../reducers";
import { EmbeddingSchema, Schema } from "../common/types/schema";
import { ConvertedUserColors } from "../reducers/colors";
import { DatasetMetadata, Dataset } from "../common/types/entities";
import { postExplainNewTab } from "../components/framework/toasters";
import { KEYS } from "../components/util/localStorage";
import {
  storageGetTransient,
  storageSetTransient,
} from "../components/util/transientLocalStorage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function setGlobalConfig(config: any) {
  /**
   * Set any global run-time config not _exclusively_ managed by the config reducer.
   * This should only set fields defined in globals.globalConfig.
   */
  globals.globalConfig.maxCategoricalOptionsToDisplay =
    config?.parameters?.["max-category-items"] ??
    globals.globalConfig.maxCategoricalOptionsToDisplay;
}

/*
return promise fetching user-configured colors
*/
async function userColorsFetchAndLoad(
  dispatch: AppDispatch
): Promise<{ type: string; userColors: ConvertedUserColors }> {
  return fetchJson<{ [category: string]: { [label: string]: string } }>(
    "colors"
  ).then((response) =>
    dispatch({
      type: "universe: user color load success",
      userColors: loadUserColorConfig(response),
    })
  );
}

async function schemaFetch(): Promise<{ schema: Schema }> {
  return fetchJson<{ schema: Schema }>("schema");
}

async function configFetch(dispatch: AppDispatch): Promise<Config> {
  const response = await fetchJson<{ config: globals.Config }>("config");
  const config = { ...globals.configDefaults, ...response.config };

  setGlobalConfig(config);

  dispatch({
    type: "configuration load complete",
    config,
  });
  return config;
}

/*
 Fetch dataset metadata and dispatch save to store, including portal URL returned in /config.
 @param dispatch Function facilitating update of store.
 @param config Response from config endpoint containing collection ID for the current dataset.
 */
async function datasetMetadataFetch(
  dispatch: AppDispatch,
  config: Config
): Promise<void> {
  const { links } = config;
  // const datasetMetadata = await fetchJson<{ metadata: DatasetMetadata }>(
  //     "dataset-metadata"
  // );
  const datasetMetadata = {
    collection_contact_email: "Martin.Kampmann@ucsf.edu",
    collection_contact_name: "Martin Kampmann",
    collection_datasets: [
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878084.411252,
        dataset_assets: [
          {
            created_at: 1605878084.445833,
            dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
            filename: "kampmann_SFG_Inh.h5ad",
            filetype: "H5AD",
            id: "25b9ae3f-4bbd-416b-b9b7-24d4ba0f99cf",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/b89266f7-2453-4fd1-98a7-f8e3ebf7bb31/kampmann_SFG_Inh.h5ad",
            type: "REMIX",
            updated_at: 1605878084.445841,
            user_submitted: false,
          },
          {
            created_at: 1605878084.445845,
            dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
            filename: "kampmann_SFG_Inh.rds",
            filetype: "RDS",
            id: "8922ff99-7509-4600-bb28-0c3c1eb92362",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/b89266f7-2453-4fd1-98a7-f8e3ebf7bb31/kampmann_SFG_Inh.rds",
            type: "REMIX",
            updated_at: 1605878084.445848,
            user_submitted: false,
          },
          {
            created_at: 1605878084.44585,
            dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
            filename: "kampmann_SFG_Inh.loom",
            filetype: "LOOM",
            id: "3df74a4a-eb76-42e5-a9a3-63e695fc1090",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/b89266f7-2453-4fd1-98a7-f8e3ebf7bb31/kampmann_SFG_Inh.loom",
            type: "REMIX",
            updated_at: 1605878084.445853,
            user_submitted: false,
          },
          {
            created_at: 1623348705.653873,
            dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "eba69e27-6ed5-4942-8cec-98918319d88a",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_Inh.cxg/",
            type: "REMIX",
            updated_at: 1623348705.653885,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_Inh.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "2ea864a4-0baf-4375-bffe-c75887611cac",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG inhibitory neurons",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878084.574572,
          dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
          id: "2df9b000-c186-4451-ae5b-24fbeaa32415",
          updated_at: 1605878084.574585,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.186955,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878083.901475,
        dataset_assets: [
          {
            created_at: 1605878083.937349,
            dataset_id: "2f281208-d759-4544-b54f-86a416021dfd",
            filename: "kampmann_EC_Micro.h5ad",
            filetype: "H5AD",
            id: "49f8f9c1-3af3-43ab-8562-b8c7c133037a",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e6fdbd73-c2af-4c6b-b690-58b4522e9604/kampmann_EC_Micro.h5ad",
            type: "REMIX",
            updated_at: 1605878083.937358,
            user_submitted: false,
          },
          {
            created_at: 1605878083.937362,
            dataset_id: "2f281208-d759-4544-b54f-86a416021dfd",
            filename: "kampmann_EC_Micro.rds",
            filetype: "RDS",
            id: "08202076-94e3-478b-b50c-8844809c71dd",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e6fdbd73-c2af-4c6b-b690-58b4522e9604/kampmann_EC_Micro.rds",
            type: "REMIX",
            updated_at: 1605878083.937365,
            user_submitted: false,
          },
          {
            created_at: 1605878083.937368,
            dataset_id: "2f281208-d759-4544-b54f-86a416021dfd",
            filename: "kampmann_EC_Micro.loom",
            filetype: "LOOM",
            id: "5d91f3d4-fb04-4e3a-b41b-fc8fc5a39327",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e6fdbd73-c2af-4c6b-b690-58b4522e9604/kampmann_EC_Micro.loom",
            type: "REMIX",
            updated_at: 1605878083.93737,
            user_submitted: false,
          },
          {
            created_at: 1623348705.525259,
            dataset_id: "2f281208-d759-4544-b54f-86a416021dfd",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "2d95dccf-d933-4ee9-b008-88a80cc4ac05",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_Micro.cxg/",
            type: "REMIX",
            updated_at: 1623348705.525272,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_Micro.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "2f281208-d759-4544-b54f-86a416021dfd",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: EC microglia",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878084.067561,
          dataset_id: "2f281208-d759-4544-b54f-86a416021dfd",
          id: "986880bc-1378-4ad8-bd1a-19c811702a55",
          updated_at: 1605878084.067574,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.186961,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878088.507128,
        dataset_assets: [
          {
            created_at: 1605878088.575317,
            dataset_id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
            filename: "kampmann_SFG_Micro.h5ad",
            filetype: "H5AD",
            id: "d9c38d82-7eb6-4a94-8310-d46890448324",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/f129ada5-d3e2-4c66-a085-6846767b576c/kampmann_SFG_Micro.h5ad",
            type: "REMIX",
            updated_at: 1605878088.57533,
            user_submitted: false,
          },
          {
            created_at: 1605878088.575335,
            dataset_id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
            filename: "kampmann_SFG_Micro.rds",
            filetype: "RDS",
            id: "544b04cb-104a-44be-a462-d572d21f8615",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/f129ada5-d3e2-4c66-a085-6846767b576c/kampmann_SFG_Micro.rds",
            type: "REMIX",
            updated_at: 1605878088.575339,
            user_submitted: false,
          },
          {
            created_at: 1605878088.575344,
            dataset_id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
            filename: "kampmann_SFG_Micro.loom",
            filetype: "LOOM",
            id: "fb39497d-ff58-4cfa-8cd6-de7889ec0973",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/f129ada5-d3e2-4c66-a085-6846767b576c/kampmann_SFG_Micro.loom",
            type: "REMIX",
            updated_at: 1605878088.575348,
            user_submitted: false,
          },
          {
            created_at: 1623348706.523324,
            dataset_id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "b074e12c-92b5-4e4a-9c03-7f4566473523",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_Micro.cxg/",
            type: "REMIX",
            updated_at: 1623348706.523337,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_Micro.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG microglia",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878088.706884,
          dataset_id: "38bf7ffe-31e2-4d0f-9457-14a99b5b07b7",
          id: "92e5badc-a929-4214-8ab2-1f1dbc353fe2",
          updated_at: 1605878088.706897,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.186992,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878088.003424,
        dataset_assets: [
          {
            created_at: 1605878088.03617,
            dataset_id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
            filename: "kampmann_SFG_Oligo.h5ad",
            filetype: "H5AD",
            id: "0fbc6447-ab11-4564-acc0-102e2291fc8c",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e771a20b-f233-44bb-af54-905e870f7668/kampmann_SFG_Oligo.h5ad",
            type: "REMIX",
            updated_at: 1605878088.036178,
            user_submitted: false,
          },
          {
            created_at: 1605878088.036182,
            dataset_id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
            filename: "kampmann_SFG_Oligo.rds",
            filetype: "RDS",
            id: "4ceebc3c-27df-4dd8-8006-bf15c28b79f7",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e771a20b-f233-44bb-af54-905e870f7668/kampmann_SFG_Oligo.rds",
            type: "REMIX",
            updated_at: 1605878088.036185,
            user_submitted: false,
          },
          {
            created_at: 1605878088.036188,
            dataset_id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
            filename: "kampmann_SFG_Oligo.loom",
            filetype: "LOOM",
            id: "24d1b6bd-6e9e-4c83-8344-dc35c5700c0d",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e771a20b-f233-44bb-af54-905e870f7668/kampmann_SFG_Oligo.loom",
            type: "REMIX",
            updated_at: 1605878088.03619,
            user_submitted: false,
          },
          {
            created_at: 1623348706.400152,
            dataset_id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "947f6680-31bf-40db-b9e5-6f874192cec0",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_Oligo.cxg/",
            type: "REMIX",
            updated_at: 1623348706.400165,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_Oligo.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG oligodendrocyte",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878088.199248,
          dataset_id: "6e7fb93c-4fd6-4d71-8274-a70a2f4aae57",
          id: "74ed87a0-7005-46f3-bc22-ee556ab9f9e3",
          updated_at: 1605878088.199262,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187202,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878085.95757,
        dataset_assets: [
          {
            created_at: 1605878086.027029,
            dataset_id: "a103a7ac-2dd6-414d-a179-cb36be986629",
            filename: "kampmann_EC_Inh.h5ad",
            filetype: "H5AD",
            id: "ffca5335-f343-473e-93a3-5f561d179570",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/d256355f-debc-4e2a-8ec1-9e2c78516948/kampmann_EC_Inh.h5ad",
            type: "REMIX",
            updated_at: 1605878086.027041,
            user_submitted: false,
          },
          {
            created_at: 1605878086.027047,
            dataset_id: "a103a7ac-2dd6-414d-a179-cb36be986629",
            filename: "kampmann_EC_Inh.rds",
            filetype: "RDS",
            id: "0133cba8-4a38-4af1-aeed-52f855c71217",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/d256355f-debc-4e2a-8ec1-9e2c78516948/kampmann_EC_Inh.rds",
            type: "REMIX",
            updated_at: 1605878086.027051,
            user_submitted: false,
          },
          {
            created_at: 1605878086.027055,
            dataset_id: "a103a7ac-2dd6-414d-a179-cb36be986629",
            filename: "kampmann_EC_Inh.loom",
            filetype: "LOOM",
            id: "74146ed2-3026-436d-b16d-96c9225d8218",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/d256355f-debc-4e2a-8ec1-9e2c78516948/kampmann_EC_Inh.loom",
            type: "REMIX",
            updated_at: 1605878086.027059,
            user_submitted: false,
          },
          {
            created_at: 1623348706.023861,
            dataset_id: "a103a7ac-2dd6-414d-a179-cb36be986629",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "eea8facb-7f84-4de4-abd1-713e550b7b73",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_Inh.cxg/",
            type: "REMIX",
            updated_at: 1623348706.023873,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_Inh.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "a103a7ac-2dd6-414d-a179-cb36be986629",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: EC inhibitory neurons",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878086.15937,
          dataset_id: "a103a7ac-2dd6-414d-a179-cb36be986629",
          id: "25719f54-16ee-4744-a862-98740b173da1",
          updated_at: 1605878086.159382,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187404,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878087.504897,
        dataset_assets: [
          {
            created_at: 1605878087.570687,
            dataset_id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
            filename: "kampmann_SFG_Exc.h5ad",
            filetype: "H5AD",
            id: "fe501ccb-e573-4138-b4e2-3005d781e9c1",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e47d3717-8d61-4ce4-8b20-f2b06ab51000/kampmann_SFG_Exc.h5ad",
            type: "REMIX",
            updated_at: 1605878087.570699,
            user_submitted: false,
          },
          {
            created_at: 1605878087.570705,
            dataset_id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
            filename: "kampmann_SFG_Exc.rds",
            filetype: "RDS",
            id: "5bcd716a-1100-491b-8cd6-184d66e88756",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e47d3717-8d61-4ce4-8b20-f2b06ab51000/kampmann_SFG_Exc.rds",
            type: "REMIX",
            updated_at: 1605878087.570709,
            user_submitted: false,
          },
          {
            created_at: 1605878087.570713,
            dataset_id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
            filename: "kampmann_SFG_Exc.loom",
            filetype: "LOOM",
            id: "894af362-9a96-4e22-8c8c-067a157b6f0c",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/e47d3717-8d61-4ce4-8b20-f2b06ab51000/kampmann_SFG_Exc.loom",
            type: "REMIX",
            updated_at: 1605878087.570717,
            user_submitted: false,
          },
          {
            created_at: 1623348705.154671,
            dataset_id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "b163db50-f70c-494b-9744-01b64d63bca8",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_Exc.cxg/",
            type: "REMIX",
            updated_at: 1623348705.154684,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_Exc.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG excitatory neurons",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878087.699141,
          dataset_id: "b17c2987-6e2c-44bd-b7a8-a29c60bd7208",
          id: "b476f4c7-ecd3-44b6-aa00-75647445e33c",
          updated_at: 1605878087.699146,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187466,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878086.471471,
        dataset_assets: [
          {
            created_at: 1605878086.57287,
            dataset_id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
            filename: "kampmann_SFG_Astro.h5ad",
            filetype: "H5AD",
            id: "c39c96ef-1e5d-450f-8cc2-a46eb9cf7a7c",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/9636b3b6-d7df-4612-a731-55643f52f759/kampmann_SFG_Astro.h5ad",
            type: "REMIX",
            updated_at: 1605878086.572878,
            user_submitted: false,
          },
          {
            created_at: 1605878086.572882,
            dataset_id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
            filename: "kampmann_SFG_Astro.rds",
            filetype: "RDS",
            id: "8c3cef15-4256-471e-a692-95472bf7ed36",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/9636b3b6-d7df-4612-a731-55643f52f759/kampmann_SFG_Astro.rds",
            type: "REMIX",
            updated_at: 1605878086.572885,
            user_submitted: false,
          },
          {
            created_at: 1605878086.572888,
            dataset_id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
            filename: "kampmann_SFG_Astro.loom",
            filetype: "LOOM",
            id: "9880085f-8127-406c-aa80-1eb2437b7861",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/9636b3b6-d7df-4612-a731-55643f52f759/kampmann_SFG_Astro.loom",
            type: "REMIX",
            updated_at: 1605878086.57289,
            user_submitted: false,
          },
          {
            created_at: 1623348706.148353,
            dataset_id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "9b5169d1-5a51-4f64-80f6-ca90a398beae",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_Astro.cxg/",
            type: "REMIX",
            updated_at: 1623348706.148366,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_Astro.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG astrocytes",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878086.538431,
          dataset_id: "b212b513-6caf-46e3-aada-b9ac048b89ae",
          id: "b4af4d29-5f6c-49f2-91eb-9966770882e8",
          updated_at: 1605878086.538438,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187469,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878083.386224,
        dataset_assets: [
          {
            created_at: 1605878083.456613,
            dataset_id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
            filename: "kampmann_EC_Oligo.rds",
            filetype: "RDS",
            id: "f63715be-fe57-477a-83ee-e7f0207d3ebd",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/0894772e-3c14-4292-8452-b8a5ab92659e/kampmann_EC_Oligo.rds",
            type: "REMIX",
            updated_at: 1605878083.456616,
            user_submitted: false,
          },
          {
            created_at: 1605878083.456619,
            dataset_id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
            filename: "kampmann_EC_Oligo.loom",
            filetype: "LOOM",
            id: "00e0bea8-4ead-47a4-a948-7342e337ed95",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/0894772e-3c14-4292-8452-b8a5ab92659e/kampmann_EC_Oligo.loom",
            type: "REMIX",
            updated_at: 1605878083.456621,
            user_submitted: false,
          },
          {
            created_at: 1605878083.456601,
            dataset_id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
            filename: "kampmann_EC_Oligo.h5ad",
            filetype: "H5AD",
            id: "c2924c66-1693-420f-a9ee-16051cc20705",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/0894772e-3c14-4292-8452-b8a5ab92659e/kampmann_EC_Oligo.h5ad",
            type: "REMIX",
            updated_at: 1605878083.456609,
            user_submitted: false,
          },
          {
            created_at: 1623348705.403141,
            dataset_id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "c4beb1f5-1c88-4154-8a33-9ee002d7ceb4",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_Oligo.cxg/",
            type: "REMIX",
            updated_at: 1623348705.403154,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_Oligo.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: EC oligodendrocyte",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878083.422839,
          dataset_id: "d34a3369-bb0b-4d82-961d-020d7785b5f6",
          id: "9ea89c7e-ec66-43de-82af-58d3e24760fa",
          updated_at: 1605878083.422847,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187608,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878084.914242,
        dataset_assets: [
          {
            created_at: 1605878085.016712,
            dataset_id: "d6e7a584-d286-41b7-9705-42595af0de20",
            filename: "kampmann_EC_Astro.h5ad",
            filetype: "H5AD",
            id: "320d140c-32d9-42f0-9129-33ee1a6c2886",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/ad42adc8-46f9-4e1d-8794-a5ea03e48b3e/kampmann_EC_Astro.h5ad",
            type: "REMIX",
            updated_at: 1605878085.01672,
            user_submitted: false,
          },
          {
            created_at: 1605878085.016723,
            dataset_id: "d6e7a584-d286-41b7-9705-42595af0de20",
            filename: "kampmann_EC_Astro.rds",
            filetype: "RDS",
            id: "1e61d039-239c-45cf-b5cd-db62ed5f9b0a",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/ad42adc8-46f9-4e1d-8794-a5ea03e48b3e/kampmann_EC_Astro.rds",
            type: "REMIX",
            updated_at: 1605878085.016726,
            user_submitted: false,
          },
          {
            created_at: 1605878085.016729,
            dataset_id: "d6e7a584-d286-41b7-9705-42595af0de20",
            filename: "kampmann_EC_Astro.loom",
            filetype: "LOOM",
            id: "50009c08-0f21-49f0-a65a-96e98f6c9d0f",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/ad42adc8-46f9-4e1d-8794-a5ea03e48b3e/kampmann_EC_Astro.loom",
            type: "REMIX",
            updated_at: 1605878085.016731,
            user_submitted: false,
          },
          {
            created_at: 1623348705.780215,
            dataset_id: "d6e7a584-d286-41b7-9705-42595af0de20",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "5115ca0f-ace1-4dcd-8d66-39dd72703704",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_Astro.cxg/",
            type: "REMIX",
            updated_at: 1623348705.780228,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_Astro.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "d6e7a584-d286-41b7-9705-42595af0de20",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: EC astrocytes",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878084.981129,
          dataset_id: "d6e7a584-d286-41b7-9705-42595af0de20",
          id: "a80b2050-389a-44bd-90a7-70346de5ade9",
          updated_at: 1605878084.981138,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187639,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878085.445614,
        dataset_assets: [
          {
            created_at: 1605878085.480484,
            dataset_id: "e4df7388-c776-4979-9c43-98a315445247",
            filename: "kampmann_EC_Exc.h5ad",
            filetype: "H5AD",
            id: "4f3dd229-15da-43b1-bbe3-04de04a83498",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/536c2756-b3f6-4fa8-8e88-b12e403440ed/kampmann_EC_Exc.h5ad",
            type: "REMIX",
            updated_at: 1605878085.480492,
            user_submitted: false,
          },
          {
            created_at: 1605878085.480496,
            dataset_id: "e4df7388-c776-4979-9c43-98a315445247",
            filename: "kampmann_EC_Exc.rds",
            filetype: "RDS",
            id: "e813a2e0-f109-4880-90b1-b32b8b5bc28a",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/536c2756-b3f6-4fa8-8e88-b12e403440ed/kampmann_EC_Exc.rds",
            type: "REMIX",
            updated_at: 1605878085.480499,
            user_submitted: false,
          },
          {
            created_at: 1605878085.480502,
            dataset_id: "e4df7388-c776-4979-9c43-98a315445247",
            filename: "kampmann_EC_Exc.loom",
            filetype: "LOOM",
            id: "b3728324-63cf-45fc-a8a6-ee15a3501a52",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/536c2756-b3f6-4fa8-8e88-b12e403440ed/kampmann_EC_Exc.loom",
            type: "REMIX",
            updated_at: 1605878085.480504,
            user_submitted: false,
          },
          {
            created_at: 1623348705.902108,
            dataset_id: "e4df7388-c776-4979-9c43-98a315445247",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "47c81a62-2127-4a05-a0e1-084e2772362b",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_Exc.cxg/",
            type: "REMIX",
            updated_at: 1623348705.902121,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_Exc.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "e4df7388-c776-4979-9c43-98a315445247",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: EC excitatory neurons",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878085.648714,
          dataset_id: "e4df7388-c776-4979-9c43-98a315445247",
          id: "fe7bd977-fb1b-4c78-8530-4259f674e1e4",
          updated_at: 1605878085.648723,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187713,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878089.016173,
        dataset_assets: [
          {
            created_at: 1605878089.081844,
            dataset_id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
            filename: "kampmann_SFG_all.h5ad",
            filetype: "H5AD",
            id: "fa9a5a42-f3bf-42f4-8bf0-84d6002d21fa",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/92f90c34-dc47-427c-a3ee-c746d8a836b0/kampmann_SFG_all.h5ad",
            type: "REMIX",
            updated_at: 1605878089.081856,
            user_submitted: false,
          },
          {
            created_at: 1605878089.081862,
            dataset_id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
            filename: "kampmann_SFG_all.rds",
            filetype: "RDS",
            id: "1a45f39e-88a9-44fa-95e7-4fa074c2af29",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/92f90c34-dc47-427c-a3ee-c746d8a836b0/kampmann_SFG_all.rds",
            type: "REMIX",
            updated_at: 1605878089.081866,
            user_submitted: false,
          },
          {
            created_at: 1605878089.081871,
            dataset_id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
            filename: "kampmann_SFG_all.loom",
            filetype: "LOOM",
            id: "44e4e222-5386-41df-8cca-5f10cb829999",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/92f90c34-dc47-427c-a3ee-c746d8a836b0/kampmann_SFG_all.loom",
            type: "REMIX",
            updated_at: 1605878089.081875,
            user_submitted: false,
          },
          {
            created_at: 1623348706.653357,
            dataset_id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "9a0ad80d-20a1-4e82-b880-67c89bed8811",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_SFG_all.cxg/",
            type: "REMIX",
            updated_at: 1623348706.65337,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_SFG_all.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: superior frontal gyrus",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878089.213946,
          dataset_id: "e643b5f3-84d9-4d77-b874-fb9bc4ea6cf3",
          id: "1c8190ed-0030-4b3a-b22d-5b797b7744f2",
          updated_at: 1605878089.213955,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "superior frontal gyrus",
            ontology_term_id: "UBERON:0002661",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187719,
      },
      {
        assay: [
          {
            label: "10X 3' v2 sequencing",
            ontology_term_id: "EFO:0009899",
          },
        ],
        collection_id: "4902a82a-7acc-445c-8660-6418dcde6232",
        collection_visibility: "PUBLIC",
        created_at: 1605878086.988476,
        dataset_assets: [
          {
            created_at: 1605878087.059293,
            dataset_id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
            filename: "kampmann_EC_all.h5ad",
            filetype: "H5AD",
            id: "59e92e34-2411-4dab-bfbc-5b46c8a2702d",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/3bb913f2-e7b8-452c-9f7f-ac1c98b63fe7/kampmann_EC_all.h5ad",
            type: "REMIX",
            updated_at: 1605878087.059305,
            user_submitted: false,
          },
          {
            created_at: 1605878087.05931,
            dataset_id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
            filename: "kampmann_EC_all.rds",
            filetype: "RDS",
            id: "4e1ea3af-8a5c-4e3d-b208-93145744826d",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/3bb913f2-e7b8-452c-9f7f-ac1c98b63fe7/kampmann_EC_all.rds",
            type: "REMIX",
            updated_at: 1605878087.059315,
            user_submitted: false,
          },
          {
            created_at: 1605878087.059319,
            dataset_id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
            filename: "kampmann_EC_all.loom",
            filetype: "LOOM",
            id: "61ade74f-ef92-40f8-b65d-7547caaf7406",
            s3_uri:
              "s3://corpora-data-staging/5b1985dd-f631-4856-b19f-9e96656d5d65/3bb913f2-e7b8-452c-9f7f-ac1c98b63fe7/kampmann_EC_all.loom",
            type: "REMIX",
            updated_at: 1605878087.059323,
            user_submitted: false,
          },
          {
            created_at: 1623348706.275081,
            dataset_id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
            filename: "explorer_cxg",
            filetype: "CXG",
            id: "7dc08851-77f3-4d71-8b15-724b3964bbda",
            s3_uri: "s3://hosted-cellxgene-staging/kampmann_EC_all.cxg/",
            type: "REMIX",
            updated_at: 1623348706.275095,
            user_submitted: true,
          },
        ],
        dataset_deployments: [
          {
            url: "https://cellxgene.staging.single-cell.czi.technology/e/kampmann_EC_all.cxg/",
          },
        ],
        development_stage: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        disease: [
          {
            label: "Alzheimer disease",
            ontology_term_id: "MONDO:0004975",
          },
        ],
        ethnicity: [
          {
            label: "unknown",
            ontology_term_id: "",
          },
        ],
        id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
        is_valid: false,
        linked_genesets: [],
        mean_genes_per_cell: 0.0,
        name: "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: caudal entorhinal cortex",
        organism: [
          {
            label: "Homo sapiens",
            ontology_term_id: "NCBITaxon:9606",
          },
        ],
        processing_status: {
          conversion_anndata_status: "NA",
          conversion_cxg_status: "CONVERTED",
          conversion_loom_status: "CONVERTED",
          conversion_rds_status: "CONVERTED",
          created_at: 1605878087.191655,
          dataset_id: "efa48b08-5e36-4a2f-a3b6-224c2c90a5c4",
          id: "56b65602-7670-48e9-8cba-fe4876e3a1ed",
          updated_at: 1605878087.191669,
          upload_message: "",
          upload_progress: 100.0,
          upload_status: "UPLOADED",
          validation_message: "",
          validation_status: "VALID",
        },
        published: true,
        revision: 0,
        schema_version: "1.1.0",
        sex: [
          {
            label: "male",
            sex_ontology_term_id: "unknown",
          },
        ],
        tissue: [
          {
            label: "entorhinal cortex",
            ontology_term_id: "UBERON:0002728",
          },
        ],
        tombstone: false,
        updated_at: 1631560600.187766,
      },
    ],
    collection_description:
      "Single-nuclei RNA sequencing of caudal entorhinal cortex and superior frontal gyrus from individuals spanning the neuropathological progression of AD",
    collection_links: [
      {
        link_name: "GEO",
        link_type: "RAW_DATA",
        link_url:
          "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE147528",
      },
      {
        link_name: "Synapse",
        link_type: "OTHER",
        link_url: "https://www.synapse.org/#!Synapse:syn21788402/wiki/601825",
      },
    ],
    collection_name:
      "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease",
    collection_url:
      "https://cellxgene.staging.single-cell.czi.technology/collections/4902a82a-7acc-445c-8660-6418dcde6232",
    dataset_id: "2ea864a4-0baf-4375-bffe-c75887611cac",
    dataset_name:
      "Molecular characterization of selectively vulnerable neurons in Alzheimer's Disease: SFG inhibitory neurons",
  };
  dispatch({
    type: "dataset metadata load complete",
    datasetMetadata,
    portalUrl: links["collections-home-page"] ?? "hi",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
async function genesetsFetch(dispatch: any, config: any) {
  /* request genesets ONLY if the backend supports the feature */
  const defaultResponse = {
    genesets: [],
    tid: 0,
  };
  if (config?.parameters?.annotations_genesets ?? false) {
    fetchJson("genesets").then((response) => {
      dispatch({
        type: "geneset: initial load",
        data: response ?? defaultResponse,
      });
    });
  } else {
    dispatch({
      type: "geneset: initial load",
      data: defaultResponse,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function prefetchEmbeddings(annoMatrix: any) {
  /*
  prefetch requests for all embeddings
  */
  const { schema } = annoMatrix;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  const available = schema.layout.obs.map((v: any) => v.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  available.forEach((embName: any) => annoMatrix.prefetch("emb", embName));
}

/*
Application bootstrap
*/
const doInitialDataLoad = (): ((
  dispatch: AppDispatch,
  getState: GetState
) => void) =>
  catchErrorsWrap(async (dispatch: AppDispatch) => {
    dispatch({ type: "initial data load start" });

    try {
      const [config, schema] = await Promise.all([
        configFetch(dispatch),
        schemaFetch(),
        userColorsFetchAndLoad(dispatch),
      ]);

      datasetMetadataFetch(dispatch, config);

      genesetsFetch(dispatch, config);

      const baseDataUrl = `${globals.API.prefix}${globals.API.version}`;
      const annoMatrix = new AnnoMatrixLoader(baseDataUrl, schema.schema);
      const obsCrossfilter = new AnnoMatrixObsCrossfilter(annoMatrix);
      prefetchEmbeddings(annoMatrix);

      dispatch({
        type: "annoMatrix: init complete",
        annoMatrix,
        obsCrossfilter,
      });
      dispatch({ type: "initial data load complete" });

      const defaultEmbedding = config?.parameters?.default_embedding;
      const layoutSchema = schema?.schema?.layout?.obs ?? [];
      if (
        defaultEmbedding &&
        layoutSchema.some((s: EmbeddingSchema) => s.name === defaultEmbedding)
      ) {
        dispatch(embActions.layoutChoiceAction(defaultEmbedding));
      }
    } catch (error) {
      dispatch({ type: "initial data load error", error });
    }
  }, true);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
function requestSingleGeneExpressionCountsForColoringPOST(gene: any) {
  return {
    type: "color by expression",
    gene,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
const requestUserDefinedGene = (gene: any) => ({
  type: "request user defined gene success",

  data: {
    genes: [gene],
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const dispatchDiffExpErrors = (dispatch: any, response: any) => {
  switch (response.status) {
    case 403:
      dispatchNetworkErrorMessageToUser(
        "Too many cells selected for differential experesion calculation - please make a smaller selection."
      );
      break;
    case 501:
      dispatchNetworkErrorMessageToUser(
        "Differential expression is not implemented."
      );
      break;
    default: {
      const msg = `Unexpected differential expression HTTP response ${response.status}, ${response.statusText}`;
      dispatchNetworkErrorMessageToUser(msg);
      dispatch({
        type: "request differential expression error",
        error: new Error(msg),
      });
    }
  }
};

const requestDifferentialExpression =
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    set1: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    set2: any,
    num_genes = 50
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  async (dispatch: any, getState: any) => {
    dispatch({ type: "request differential expression started" });
    try {
      /*
    Steps:
    1. get the most differentially expressed genes
    2. get expression data for each
    */
      const { annoMatrix } = getState();
      const varIndexName = annoMatrix.schema.annotations.var.index;

      // Legal values are null, Array or TypedArray.  Null is initial state.
      if (!set1) set1 = [];
      if (!set2) set2 = [];

      // These lines ensure that we convert any TypedArray to an Array.
      // This is necessary because JSON.stringify() does some very strange
      // things with TypedArrays (they are marshalled to JSON objects, rather
      // than being marshalled as a JSON array).
      set1 = Array.isArray(set1) ? set1 : Array.from(set1);
      set2 = Array.isArray(set2) ? set2 : Array.from(set2);

      const res = await fetch(
        `${globals.API.prefix}${globals.API.version}diffexp/obs`,
        {
          method: "POST",
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            mode: "topN",
            count: num_genes,
            set1: { filter: { obs: { index: set1 } } },
            set2: { filter: { obs: { index: set2 } } },
          }),
          credentials: "include",
        }
      );

      if (!res.ok || res.headers.get("Content-Type") !== "application/json") {
        return dispatchDiffExpErrors(dispatch, res);
      }

      const response = await res.json();
      const varIndex = await annoMatrix.fetch("var", varIndexName);
      const diffexpLists = { negative: [], positive: [] };
      for (const polarity of Object.keys(diffexpLists)) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
        diffexpLists[polarity] = response[polarity].map((v: any) => [
          varIndex.at(v[0], varIndexName),
          ...v.slice(1),
        ]);
      }

      /* then send the success case action through */
      return dispatch({
        type: "request differential expression success",
        data: diffexpLists,
      });
    } catch (error) {
      return dispatch({
        type: "request differential expression error",
        error,
      });
    }
  };

/*
 Check local storage for flag indicating that the work in progress toast should be displayed.
 */
export const checkExplainNewTab =
  () =>
  (dispatch: AppDispatch): void => {
    const workInProgressWarn = storageGetTransient(KEYS.WORK_IN_PROGRESS_WARN);
    if (workInProgressWarn) {
      dispatch({ type: "work in progress warning displayed" });
      postExplainNewTab(
        "To maintain your in-progress work on the previous dataset, we opened this dataset in a new tab."
      );
    }
  };

/*
 Open selected dataset in a new tab.
 @param dataset Dataset to open in new tab.
 */
export const openDataset =
  (dataset: Dataset): ((dispatch: AppDispatch) => void) =>
  (dispatch: AppDispatch) => {
    const deploymentUrl = dataset.dataset_deployments?.[0].url ?? "";
    if (!deploymentUrl) {
      dispatchNetworkErrorMessageToUser("Unable to open dataset.");
      return;
    }

    dispatch({ type: "dataset opened" });
    storageSetTransient(KEYS.WORK_IN_PROGRESS_WARN, 5000);
    window.open(deploymentUrl, "_blank");
  };

/*
 Update browser location to selected dataset's deployment URL, kick off data load for the selected dataset.
 @param dataset Dataset to switch to and load in the current tab.
 */
export const switchDataset =
  (dataset: Dataset): ((dispatch: AppDispatch) => void) =>
  (dispatch: AppDispatch) => {
    dispatch({ type: "reset" });
    dispatch({ type: "dataset switch" });

    const deploymentUrl = dataset.dataset_deployments?.[0].url ?? "";
    if (!deploymentUrl) {
      dispatchNetworkErrorMessageToUser("Unable to switch datasets.");
      return;
    }
    dispatch(updateLocation(deploymentUrl));
    globals.updateApiPrefix();
    dispatch(doInitialDataLoad());
  };

/*
 Update browser location by adding corresponding entry to the session's history stack.
 @param url - URL to update browser location to. 
 */
const updateLocation = (url: string) => (dispatch: AppDispatch) => {
  dispatch({ type: "location update" });
  window.history.pushState(null, "", url);
};

function fetchJson<T>(pathAndQuery: string): Promise<T> {
  return doJsonRequest<T>(
    `${globals.API.prefix}${globals.API.version}${pathAndQuery}`
  ) as Promise<T>;
}

export default {
  doInitialDataLoad,
  requestDifferentialExpression,
  requestSingleGeneExpressionCountsForColoringPOST,
  requestUserDefinedGene,
  checkExplainNewTab,
  openDataset,
  switchDataset,
  selectContinuousMetadataAction: selnActions.selectContinuousMetadataAction,
  selectCategoricalMetadataAction: selnActions.selectCategoricalMetadataAction,
  selectCategoricalAllMetadataAction:
    selnActions.selectCategoricalAllMetadataAction,
  graphBrushStartAction: selnActions.graphBrushStartAction,
  graphBrushChangeAction: selnActions.graphBrushChangeAction,
  graphBrushDeselectAction: selnActions.graphBrushDeselectAction,
  graphBrushCancelAction: selnActions.graphBrushCancelAction,
  graphBrushEndAction: selnActions.graphBrushEndAction,
  graphLassoStartAction: selnActions.graphLassoStartAction,
  graphLassoEndAction: selnActions.graphLassoEndAction,
  graphLassoCancelAction: selnActions.graphLassoCancelAction,
  graphLassoDeselectAction: selnActions.graphLassoDeselectAction,
  clipAction: viewActions.clipAction,
  subsetAction: viewActions.subsetAction,
  resetSubsetAction: viewActions.resetSubsetAction,
  annotationCreateCategoryAction: annoActions.annotationCreateCategoryAction,
  annotationRenameCategoryAction: annoActions.annotationRenameCategoryAction,
  annotationDeleteCategoryAction: annoActions.annotationDeleteCategoryAction,
  annotationCreateLabelInCategory: annoActions.annotationCreateLabelInCategory,
  annotationDeleteLabelFromCategory:
    annoActions.annotationDeleteLabelFromCategory,
  annotationRenameLabelInCategory: annoActions.annotationRenameLabelInCategory,
  annotationLabelCurrentSelection: annoActions.annotationLabelCurrentSelection,
  saveObsAnnotationsAction: annoActions.saveObsAnnotationsAction,
  saveGenesetsAction: annoActions.saveGenesetsAction,
  needToSaveObsAnnotations: annoActions.needToSaveObsAnnotations,
  layoutChoiceAction: embActions.layoutChoiceAction,
  setCellSetFromSelection: selnActions.setCellSetFromSelection,
  genesetDelete: genesetActions.genesetDelete,
  genesetAddGenes: genesetActions.genesetAddGenes,
  genesetDeleteGenes: genesetActions.genesetDeleteGenes,
};
