/* Core dependencies */
import React, { PureComponent } from "react";
import { connect } from "react-redux";
import { Drawer, Position } from "@blueprintjs/core";

/* App dependencies */
import { DataPortalProps } from "../../globals";
import InfoFormat from "./infoFormat";
import { AppDispatch, RootState } from "../../reducers";
import { selectableCategoryNames } from "../../util/stateManager/controlsHelpers";
import { Collection } from "../../common/types/entities";

/*
 Actions dispatched by info drawer.
 */
interface DispatchProps {
  toggleDrawer: () => void;
}

/*
 Props passed in from parent.
 */
interface OwnProps {
  position?: Position;
}

/*
 Props selected from store.
 */
interface StateProps {
  collection: Collection;
  dataPortalProps: DataPortalProps;
  isOpen: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  schema: any;
}

type Props = DispatchProps & OwnProps & StateProps;

/*
 Map values selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => ({
  collection: state.collections?.collection,
  dataPortalProps: state.config?.corpora_props,
  isOpen: state.controls.datasetDrawer,
  schema: state.annoMatrix.schema,
});

/*
 Map actions dispatched by info drawer to props.
 */
const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  toggleDrawer: () => dispatch({ type: "toggle dataset drawer" }),
});

class InfoDrawer extends PureComponent<Props> {
  handleClose = () => {
    const { toggleDrawer } = this.props;
    toggleDrawer();
  };

  render(): JSX.Element {
    const { collection, position, schema, isOpen, dataPortalProps } =
      this.props;

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    const allCategoryNames = selectableCategoryNames(schema).sort();
    const singleValueCategories = new Map();

    allCategoryNames.forEach((catName: string) => {
      const isUserAnno = schema?.annotations?.obsByName[catName]?.writable;
      const colSchema = schema.annotations.obsByName[catName];
      if (!isUserAnno && colSchema.categories?.length === 1) {
        singleValueCategories.set(catName, colSchema.categories[0]);
      }
    });

    return (
      <Drawer size={480} onClose={this.handleClose} {...{ isOpen, position }}>
        <InfoFormat
          {...{
            collection,
            singleValueCategories,
            dataPortalProps: dataPortalProps ?? {},
          }}
        />
      </Drawer>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(InfoDrawer);
