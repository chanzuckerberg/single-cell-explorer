/* Core dependencies */
import React, { PureComponent } from "react";
import { connect } from "react-redux";
import { Drawer, Position } from "@blueprintjs/core";

/* App dependencies */
import InfoFormat, { SingleValues } from "./infoFormat";
import { AppDispatch, RootState } from "../../reducers";
import { selectableCategoryNames } from "../../util/stateManager/controlsHelpers";
import { SingleContinuousValueState } from "../../reducers/singleContinuousValue";

/**
 * Actions dispatched by info drawer.
 */
interface DispatchProps {
  toggleDrawer: () => void;
}

/**
 * Props passed in from parent.
 */
interface OwnProps {
  position?: Position;
}

/**
 * Props selected from store.
 */
interface StateProps {
  datasetMetadata: RootState["datasetMetadata"]["datasetMetadata"];
  isOpen: boolean;
  // @ts-expect-error -- (seve): fix downstream affects of detailed RootState typing
  schema: RootState["annoMatrix"]["schema"];
  singleContinuousValues: SingleContinuousValueState["singleContinuousValues"];
}

type Props = DispatchProps & OwnProps & StateProps;

/**
 * Map values selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => ({
  datasetMetadata: state.datasetMetadata?.datasetMetadata,
  isOpen: state.controls.datasetDrawer,
  schema: state.annoMatrix?.schema,
  singleContinuousValues: state.singleContinuousValue.singleContinuousValues,
});

/**
 * Map actions dispatched by info drawer to props.
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
    const {
      datasetMetadata,
      position,
      schema,
      isOpen,
      singleContinuousValues,
    } = this.props;

    const allCategoryNames = selectableCategoryNames(schema).sort();
    const allSingleValues: SingleValues = new Map();

    allCategoryNames.forEach((catName) => {
      const isUserAnno = schema?.annotations?.obsByName[catName]?.writable;
      const colSchema = schema.annotations.obsByName[catName];
      if (!isUserAnno && colSchema.categories?.length === 1) {
        allSingleValues.set(catName, colSchema.categories[0]);
      }
    });
    singleContinuousValues.forEach((value, catName) => {
      allSingleValues.set(catName, value);
    });
    return (
      <Drawer size={480} onClose={this.handleClose} {...{ isOpen, position }}>
        <InfoFormat
          {...{
            datasetMetadata,
            allSingleValues,
          }}
        />
      </Drawer>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(InfoDrawer);
