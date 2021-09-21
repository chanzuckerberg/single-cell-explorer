/* Core dependencies */
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { PureComponent } from "react";
import { connect } from "react-redux";

/* App dependencies */
import { openDataset, switchDataset } from "../../actions";
import { Collection, Dataset } from "../../common/types/entities";
import DatasetMenu from "./datasetMenu";
import { AppDispatch } from "../../reducers";
import TruncatingBreadcrumb from "./truncatingBreadcrumb";
import TruncatingBreadcrumbs, {
  TruncatingBreadcrumbMenuItemProps,
  TruncatingBreadcrumbMenuProps,
  TruncatingBreadcrumbProps,
} from "./truncatingBreadcrumbs";

/* styles */
// @ts-expect-error --- TODO revisit
import styles from "./datasetSelector.css";

interface Props {
  dispatch: AppDispatch;
  collection?: Collection;
  portalUrl?: string;
  selectedDatasetId?: string;
  workInProgress: boolean;
}

/*
 App-level collection and dataset breadcrumbs.
 */
// @ts-expect-error ts-migrate(1238) TODO revisit
@connect((state) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- TODO revisit
  const genesetsInProgress = (state as any).genesets?.genesets?.size > 0;
  const individualGenesInProgress =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- TODO revisit
    (state as any).controls?.userDefinedGenes?.length > 0;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- TODO revisit
    collection: (state as any).collections?.collection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- TODO revisit
    portalUrl: (state as any).collections?.portalUrl,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- TODO revisit
    selectedDatasetId: (state as any).collections?.selectedDatasetId,
    workInProgress: genesetsInProgress || individualGenesInProgress,
  };
})
class DatasetSelector extends PureComponent<Props> {
  /*
   Props shared by all breadcrumbs.
   */
  private defaultBreadcrumbProps: Partial<TruncatingBreadcrumbProps> = {
    className: styles.datasetBreadcrumb,
  };

  /*
   Create the set of breadcrumbs props to render home > collection name > dataset name, where dataset name reveals the
   dataset menu.
   @param dispatch - Function facilitating update of store.
   @param collection - Collection containing selected dataset.
   @param selectedDatasetId - ID of selected dataset.
   @param workInProgress - Flag indicating if user has applied changes to visualization.
   @param portalUrl - URL to Portal's collection index page.
   @returns Returns the set of breadcrumbs props for the current selected dataset.
  */
  buildBreadcrumbProps = (
    dispatch: AppDispatch,
    collection: Collection,
    selectedDatasetId: string,
    workInProgress: boolean,
    portalUrl: string
  ): TruncatingBreadcrumbProps[] => {
    const homeProp = this.buildHomeBreadcrumbProps(portalUrl);
    const collectionProp = this.buildCollectionBreadcrumbProps(collection);
    const datasetProp = this.buildDatasetBreadcrumbProps(
      dispatch,
      collection,
      selectedDatasetId,
      workInProgress
    );
    return [homeProp, collectionProp, datasetProp];
  };

  /*
   Sort datasets by cell count, descending.
   @param d0 - First dataset to compare.
   @param d1 - Second dataset to compare.
   @returns Number indicating if first dataset is greater than, less than or equal to second dataset.
   */
  sortDatasets = (d0: Dataset, d1: Dataset): number =>
    (d1.cell_count ?? 0) - (d0.cell_count ?? 0);

  /*
   Build menu items representing datasets that are siblings of the selected dataset.
   @param dispatch - Function facilitating update of store.
   @param collection - Collection containing selected dataset.
   @param selectedDatasetID - ID dataset currently being viewed.
   @param workInProgress - Flag indicating if user has applied changes to visualization.
   @returns Returns set of menu items each representing sibling dataset of the current selected dataset.
  */
  buildDatasetMenuItems = (
    dispatch: AppDispatch,
    collection: Collection,
    selectedDatasetID: string,
    workInProgress: boolean
  ): TruncatingBreadcrumbMenuItemProps[] =>
    [...collection.datasets]
      // Remove current dataset from the set of datasets
      .filter((dataset) => dataset.id !== selectedDatasetID)
      .sort(this.sortDatasets)
      // Build props for rendering dataset as menu item
      .map((dataset) => {
        const dispatchAction = workInProgress
          ? openDataset(dataset)
          : switchDataset(dataset);
        return {
          key: dataset.id,
          text: dataset.name,
          onClick: () => {
            dispatch(dispatchAction);
          },
        };
      });

  /*
   Find the selected dataset from the set of datasets.
   @param selectedDatasetId - The ID of the dataset currently being viewed
   @param datasets - All datasets in the selected dataset's collection 
   @returns The dataset with the given selected ID.
  */
  findDatasetById = (
    selectedDatasetId: string,
    datasets: Dataset[]
  ): Dataset | undefined =>
    datasets.find((dataset) => dataset.id === selectedDatasetId);

  /*
   Build "dataset" breadcrumb props for displaying a breadcrumb with a menu.
   @param dispatch - Function facilitating update of store.
   @param collection - Collection containing selected dataset.
   @param selectedDatasetId - ID of selected dataset.
   @param workInProgress - Flag indicating if user has applied changes to visualization.
   @returns Returns breadcrumbs props for rendering the "dataset" breadcrumb.
  */
  buildDatasetBreadcrumbProps(
    dispatch: AppDispatch,
    collection: Collection,
    selectedDatasetId: string,
    workInProgress: boolean
  ): TruncatingBreadcrumbMenuProps {
    const selectedDataset = this.findDatasetById(
      selectedDatasetId,
      collection.datasets
    );
    const datasetMenuItems = this.buildDatasetMenuItems(
      dispatch,
      collection,
      selectedDatasetId,
      workInProgress
    );
    return {
      ...this.defaultBreadcrumbProps,
      disabled: datasetMenuItems.length === 0,
      items: datasetMenuItems,
      key: `bc-dataset-${selectedDatasetId}`,
      shortText: "Dataset",
      text: selectedDataset ? selectedDataset.name : "Dataset",
    };
  }

  /*
   Build "collection" breadcrumb props, links to Portal's collection detail page. 
   @param collection - Collection containing selected dataset.
   @returns Returns breadcrumbs props for rendering the "collection" breadcrumb.
  */
  buildCollectionBreadcrumbProps(
    collection: Collection
  ): TruncatingBreadcrumbProps {
    return {
      ...this.defaultBreadcrumbProps,
      href: `${origin}collections/${collection.id}`,
      key: `bc-collection-${collection.id}`,
      shortText: "Collection",
      text: collection.name,
    };
  }

  /*
   Build "home" breadcrumb props, links to Portal's collection index page.
   @param portalUrl - URL to Portal's collection index page. 
   @returns Returns breadcrumbs props for rendering the "home" breadcrumb.
  */
  buildHomeBreadcrumbProps(portalUrl: string): TruncatingBreadcrumbProps {
    return {
      ...this.defaultBreadcrumbProps,
      href: portalUrl,
      key: "bc-home",
      shortText: "Home",
      text: "Home",
    };
  }

  /*
   Build Blueprint Breadcrumb element, adding menu-specific styles and elements if necessary.
   @param item - Breadcrumb props to be rendered as a breadcrumb element.
   @returns Breadcrumb element generated from given breadcrumb props. 
  */
  renderBreadcrumb = (item: TruncatingBreadcrumbProps): JSX.Element => (
    <TruncatingBreadcrumb item={item} />
  );

  /*
   Clicking on dataset name opens menu containing all dataset names except the current dataset name for the current
   collection.
   @param item - Breadcrumb props to be rendered as a breadcrumb element with menu.
   @returns DatasetMenu element generated from given breadcrumb props. 
  */
  renderBreadcrumbMenu = (item: TruncatingBreadcrumbMenuProps): JSX.Element => (
    <DatasetMenu items={item.items}>
      <TruncatingBreadcrumb item={item}>
        <Icon
          icon={IconNames.CHEVRON_DOWN}
          style={{ marginLeft: "5px", marginRight: 0 }}
        />
      </TruncatingBreadcrumb>
    </DatasetMenu>
  );

  /*
   Renders the final dataset breadcrumb where sibling datasets are selectable by a breadcrumb menu.
   @param item - Breadcrumb props to be rendered as a breadcrumb element with menu.
   @returns If dataset has siblings, returns breadcrumb menu element generated from given breadcrumb props. Otherwise
   returns disabled breadcrumb element.  
   */
  renderDatasetBreadcrumb = (
    item: TruncatingBreadcrumbMenuProps
  ): JSX.Element =>
    item.items.length
      ? this.renderBreadcrumbMenu(item)
      : this.renderBreadcrumb(item);

  render(): JSX.Element | null {
    const {
      collection,
      dispatch,
      portalUrl,
      selectedDatasetId,
      workInProgress,
    } = this.props;
    if (!collection || !portalUrl || !selectedDatasetId) {
      return null;
    }
    return (
      <div
        style={{
          marginTop: "8px", // Match margin on sibling menu buttons
          flexGrow: 1,
          overflow: "scroll",
          flex: 1,
        }}
      >
        <TruncatingBreadcrumbs
          breadcrumbRenderer={this.renderBreadcrumb}
          currentBreadcrumbRenderer={this.renderDatasetBreadcrumb}
          items={this.buildBreadcrumbProps(
            dispatch,
            collection,
            selectedDatasetId,
            workInProgress,
            portalUrl
          )}
        />
      </div>
    );
  }
}

export default DatasetSelector;
