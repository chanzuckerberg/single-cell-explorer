import styled from "@emotion/styled";
import { spacesS } from "../theme";

export const MenuBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
`;

export const ResponsiveMenuGroupOne = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @media screen and (max-width: 1275px) {
    flex-direction: column-reverse;
  }
`;

export const ResponsiveMenuGroupTwo = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @media screen and (max-width: 1350px) {
    flex-direction: column-reverse;
  }
`;

export const EmbeddingWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: left;
  margin-top: ${spacesS}px;
`;

export const ControlsWrapper = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  align-items: flex-start;
  @media screen and (max-width: 1275px) {
    flex-direction: column-reverse;
    align-items: flex-end;
  }
`;
