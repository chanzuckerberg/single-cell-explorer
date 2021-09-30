/* Core dependencies */
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { PureComponent } from "react";
import { connect } from "react-redux";

/* App dependencies */
import { openDataset, switchDataset } from "../../actions";
import { DatasetMetadata, Dataset } from "../../common/types/entities";
import DatasetMenu from "./datasetMenu";
import { AppDispatch, RootState } from "../../reducers";
import { selectIsUserStateDirty } from "../../selectors/global";
import { selectIsSeamlessEnabled } from "../../selectors/datasetMetadata";
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
  datasetMetadata: DatasetMetadata;
  portalUrl: string;
  seamlessEnabled: boolean;
  workInProgress: boolean;
}

type Props = StateProps & DispatchProps;

/*
 Map slice selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => {
  return {
    datasetMetadata: state.datasetMetadata?.datasetMetadata,
    portalUrl: state.datasetMetadata?.portalUrl,
    seamlessEnabled: selectIsSeamlessEnabled(state),
    workInProgress: selectIsUserStateDirty(state),
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
   Returns the action dispatched when a new dataset is selected.
   Action dispatched is one of the following:
   - when datasets are to be switched in the current tab.
   - when selected dataset is to be opened in a new tab.
   @param selectedDataset - selected dataset to be viewed.
   */
  onDatasetSelected(selectedDataset: Dataset) {
    const {
      openDataset: openFn,
      switchDataset: switchFn,
      workInProgress,
    } = this.props;

    if (workInProgress) {
      openFn(selectedDataset);
    } else {
      switchFn(selectedDataset);
    }
  }

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
   @param datasetMetadata - Dataset metadata containing selected dataset.
   @param selectedDatasetID - ID dataset currently being viewed.
   @returns Returns set of menu items each representing sibling dataset of the current selected dataset.
  */
  buildDatasetMenuItems = (
    datasetMetadata: DatasetMetadata,
    selectedDatasetID: string
  ): TruncatingBreadcrumbMenuItemProps[] =>
    [...datasetMetadata.collection_datasets]
      // Remove current dataset from the set of datasets
      .filter((dataset) => dataset.id !== selectedDatasetID)
      .sort(this.sortDatasets)
      // Build props for rendering dataset as menu item
      .map((dataset) => ({
        key: dataset.id,
        text: dataset.name,
        onClick: () => this.onDatasetSelected(dataset),
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
   @param datasetMetadata - Dataset metadata containing selected dataset.
   @returns Returns breadcrumbs props for rendering the "dataset" breadcrumb.
  */
  buildDatasetBreadcrumbProps(
    datasetMetadata: DatasetMetadata
  ): TruncatingBreadcrumbMenuProps {
    const { dataset_id: selectedDatasetId } = datasetMetadata;
    const selectedDataset = this.findDatasetById(
      selectedDatasetId,
      datasetMetadata.collection_datasets
    );
    const datasetMenuItems = this.buildDatasetMenuItems(
      datasetMetadata,
      selectedDatasetId
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
   @param datasetMetadata - Dataset metadata containing collection information.
   @returns Returns breadcrumbs props for rendering the "collection" breadcrumb.
  */
  buildCollectionBreadcrumbProps(
    datasetMetadata: DatasetMetadata
  ): TruncatingBreadcrumbProps {
    return {
      ...this.defaultBreadcrumbProps,
      href: datasetMetadata.collection_url,
      key: `bc-collection`,
      shortText: "Collection",
      text: datasetMetadata.collection_name,
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
    const { datasetMetadata, portalUrl, seamlessEnabled } = this.props;
    if (!seamlessEnabled) {
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
            this.buildCollectionBreadcrumbProps(datasetMetadata),
            this.buildDatasetBreadcrumbProps(datasetMetadata),
          ]}
        />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DatasetSelector);
