import React from "react";

import { connect } from "react-redux";
import { Section, Wrapper } from "./style";
import Opacity from "./components/Opacity";
import { RootState } from "../../../../reducers";
import { Props, StateProps } from "./types";

function Opacities({ imageOpacity, dotOpacity, dispatch }: Props) {
  return (
    <Wrapper>
      <Section>
        <Opacity
          name="Image Opacity"
          value={imageOpacity}
          handleChange={handleImageOpacityChange}
        />
      </Section>
      <Section>
        <Opacity
          name="Dot Opacity"
          value={dotOpacity}
          handleChange={handleDotOpacityChange}
        />
      </Section>
    </Wrapper>
  );

  function handleImageOpacityChange(
    _: Event | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: number | number[]
  ) {
    dispatch({
      type: "set image opacity",
      data: value,
    });
  }

  function handleDotOpacityChange(
    _: Event | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: number | number[]
  ) {
    dispatch({
      type: "set dot opacity",
      data: value,
    });
  }
}

function mapStateToProps({ controls }: RootState): StateProps {
  const { imageOpacity, dotOpacity } = controls;

  return {
    imageOpacity,
    dotOpacity,
  };
}

export default connect(mapStateToProps)(Opacities);
