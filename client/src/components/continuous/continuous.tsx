/* rc slider https://www.npmjs.com/package/rc-slider */

import React from "react";
import { connect } from "react-redux";
import HistogramBrush from "../brushableHistogram";
import Collapse from "../../util/collapse";
import { RootState } from "../../reducers";
import AnnoMatrix from "../../annoMatrix/annoMatrix";
import { AnnotationColumnSchema } from "../../common/types/schema";
import { CONTINUOUS_SECTION_TEST_ID } from "./constants";

interface StateProps {
  schema?: AnnoMatrix["schema"];
}

function mapStateToProps(state: RootState): StateProps {
  return {
    schema: state.annoMatrix?.schema,
  };
}
class Continuous extends React.PureComponent<StateProps> {
  render() {
    /* initial value for iterator to simulate index, ranges is an object */
    const { schema } = this.props;
    if (!schema) return null;
    const obsIndex = schema.annotations.obs.index;
    const allContinuousNames = schema.annotations.obs.columns
      .filter(
        (col: AnnotationColumnSchema) =>
          col.type === "int32" || col.type === "float32"
      )
      .filter((col: AnnotationColumnSchema) => col.name !== obsIndex)
      .filter((col: AnnotationColumnSchema) => !col.writable) // skip user annotations - they will be treated as categorical
      .map((col: AnnotationColumnSchema) => col.name);
    return allContinuousNames.length ? (
      <div data-testid={CONTINUOUS_SECTION_TEST_ID}>
        <Collapse>
          <span style={{ paddingLeft: 10 }}>Continuous</span>
          {allContinuousNames.map((key, index) => (
            <HistogramBrush
              key={key}
              field={key}
              isObs
              zebra={index % 2 === 0}
              onGeneExpressionComplete={() => {}}
              mini={false}
            />
          ))}
        </Collapse>
      </div>
    ) : null;
  }
}

export default connect(mapStateToProps)(Continuous);
