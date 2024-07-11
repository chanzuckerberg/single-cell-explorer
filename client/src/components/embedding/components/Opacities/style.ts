import styled from "@emotion/styled";
import { spacesM, spacesS } from "../../../theme";

export const Wrapper = styled.div`
  padding: ${spacesS}px ${spacesM}px;
  width: 250px;
  height: 200px;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
`;

export const Section = styled.div`
  padding: 0 ${spacesS}px;
`;
