import React, { ChangeEvent } from "react";
import { InputSlider } from "czifui";
import { SliderProps } from "@material-ui/core";

import { kebabCase } from "lodash";
import {
  HeaderWrapper,
  InputTextWrapper,
  Mark,
  Percentage,
  StyledInputText,
  Title,
} from "./style";

const MARKS = [
  {
    value: 0,
    label: <Mark>0</Mark>,
  },
  {
    value: 50,
    label: <Mark>50</Mark>,
  },
  {
    value: 100,
    label: <Mark>100</Mark>,
  },
];

interface Props {
  name: string;
  value: number;
  handleChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: number | number[]
  ) => void;
}

export default function Opacity({ name, value, handleChange }: Props) {
  const kebabName = kebabCase(name);

  return (
    <>
      <HeaderWrapper>
        <Title>{name}</Title>
        <InputTextWrapper>
          <StyledInputText
            id={kebabName}
            data-testid={`${kebabName}-input`}
            label={name}
            hideLabel
            sdsType="textField"
            value={value}
            onChange={(event) => {
              handleChange(event, Number(event.target.value));
            }}
            type="number"
            inputProps={{
              min: 0,
              max: 100,
              "aria-labelledby": "image-opacity-label",
              "aria-label": "Image Opacity",
            }}
          />
          <Percentage>%</Percentage>
        </InputTextWrapper>
      </HeaderWrapper>

      <InputSlider
        data-testid={`${kebabName}-slider`}
        marks={MARKS}
        value={value}
        step={10}
        min={0}
        max={100}
        onChange={handleChange as SliderProps["onChange"]}
      />
    </>
  );
}
