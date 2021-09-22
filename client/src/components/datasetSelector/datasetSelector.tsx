/* Core dependencies */
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { PureComponent } from "react";
import { connect } from "react-redux";

/* App dependencies */
import { openDataset, switchDataset } from "../../actions";
import { Collection, Dataset } from "../../common/types/entities";
import DatasetMenu from "./datasetMenu";
import { AppDispatch, RootState } from "../../reducers";
import TruncatingBreadcrumb from "./truncatingBreadcrumb";
import TruncatingBreadcrumbs, {
  TruncatingBreadcrumbMenuItemProps,
  TruncatingBreadcrumbMenuProps,
  TruncatingBreadcrumbProps,
} from "./truncatingBreadcrumbs";

/* styles */
// @ts-expect-error --- TODO revisit
import styles from "./datasetSelector.css";

/*
 Actions dispatched by dataset selector.
 */
interface DispatchProps {
  openDataset: (dataset: Dataset) => void;
  switchDataset: (dataset: Dataset) => void;
}

/*
 Props selected from store.
 */
interface StateProps {
  collection: Collection;
  portalUrl: string;
  selectedDatasetId: string;
  workInProgress: boolean;
}

type Props = StateProps & DispatchProps;

/*
 Map slice selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => {
  const genesetsInProgress = state.genesets?.genesets?.size > 0;
  const individualGenesInProgress =
    state.controls?.userDefinedGenes?.length > 0;
  return {
    collection: state.collections?.collection,
    portalUrl: state.collections?.portalUrl,
    selectedDatasetId: state.collections?.selectedDatasetId,
    workInProgress: genesetsInProgress || individualGenesInProgress,
  };
};

/*
 Map actions dispatched by dataset selector to props.
 */
const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  openDataset: (dataset: Dataset) => dispatch(openDataset(dataset)),
  switchDataset: (dataset: Dataset) => dispatch(switchDataset(dataset)),
});

/*
 App-level collection and dataset breadcrumbs.
 */
class DatasetSelector extends PureComponent<Props> {
  /*
   Props shared by all breadcrumbs.
   */
  private defaultBreadcrumbProps: Partial<TruncatingBreadcrumbProps> = {
    className: styles.datasetBreadcrumb,
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
   @param collection - Collection containing selected dataset.
   @param selectedDatasetID - ID dataset currently being viewed.
   @param workInProgress - Flag indicating if user has applied changes to visualization.
   @param switchFn - Action dispatched when datasets are to be switched in the current tab.
   @param openFn - Action dispatched when selected dataset is to be opened in a new tab.
   @returns Returns set of menu items each representing sibling dataset of the current selected dataset.
  */
  buildDatasetMenuItems = (
    collection: Collection,
    selectedDatasetID: string,
    workInProgress: boolean,
    switchFn: (dataset: Dataset) => void,
    openFn: (dataset: Dataset) => void
  ): TruncatingBreadcrumbMenuItemProps[] =>
    [...collection.datasets]
      // Remove current dataset from the set of datasets
      .filter((dataset) => dataset.id !== selectedDatasetID)
      .sort(this.sortDatasets)
      // Build props for rendering dataset as menu item
      .map((dataset) => ({
        key: dataset.id,
        text: dataset.name,
        onClick: () => (workInProgress ? openFn(dataset) : switchFn(dataset)),
      }));

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
   @param collection - Collection containing selected dataset.
   @param selectedDatasetId - ID of selected dataset.
   @param workInProgress - Flag indicating if user has applied changes to visualization.
   @param switchFn - Action dispatched when datasets are to be switched in the current tab.
   @param openFn - Action dispatched when selected dataset is to be opened in a new tab.
   @returns Returns breadcrumbs props for rendering the "dataset" breadcrumb.
  */
  buildDatasetBreadcrumbProps(
    collection: Collection,
    selectedDatasetId: string,
    workInProgress: boolean,
    switchFn: (dataset: Dataset) => void,
    openFn: (dataset: Dataset) => void
  ): TruncatingBreadcrumbMenuProps {
    const selectedDataset = this.findDatasetById(
      selectedDatasetId,
      collection.datasets
    );
    const datasetMenuItems = this.buildDatasetMenuItems(
      collection,
      selectedDatasetId,
      workInProgress,
      switchFn,
      openFn
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
   @param portalUrl - URL to Portal.
   @param collection - Collection containing selected dataset.
   @returns Returns breadcrumbs props for rendering the "collection" breadcrumb.
  */
  buildCollectionBreadcrumbProps(
    portalUrl: string,
    collection: Collection
  ): TruncatingBreadcrumbProps {
    return {
      ...this.defaultBreadcrumbProps,
      href: `${portalUrl}/collections/${collection.id}`,
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
      openDataset: openFn,
      portalUrl,
      selectedDatasetId,
      switchDataset: switchFn,
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
          items={[
            this.buildHomeBreadcrumbProps(portalUrl),
            this.buildCollectionBreadcrumbProps(portalUrl, collection),
            this.buildDatasetBreadcrumbProps(
              collection,
              selectedDatasetId,
              workInProgress,
              switchFn,
              openFn
            ),
          ]}
        />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DatasetSelector);
