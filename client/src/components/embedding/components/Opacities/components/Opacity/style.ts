import styled from "@emotion/styled";
import { InputText } from "czifui";
import {
  fontWeightBold,
  spacesM,
  spacesS,
  spacesXs,
  textSecondary,
} from "../../../../../theme";

export const Mark = styled.span`
  color: ${textSecondary};
`;

export const HeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const InputTextWrapper = styled.span`
  display: flex;
  align-items: center;
  position: relative;
`;

export const StyledInputText = styled(InputText)`
  min-width: 10px;
  padding: ${spacesXs}px ${spacesM}px;
  margin: 0;
  padding: 0;

  /* Chrome, Safari, Edge, Opera remove up/down arrow */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox remove up/down arrow */
  input[type="number"] {
    -moz-appearance: textfield;
  }

  input {
    width: 60px;
    margin-left: -6px;
  }
`;

export const Percentage = styled.span`
  position: absolute;
  right: ${spacesS}px;
`;

export const Title = styled.div`
  font-weight: ${fontWeightBold};
`;
