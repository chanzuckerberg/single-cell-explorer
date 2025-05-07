import styled from "@emotion/styled";
import { spacesL } from "util/theme";

export const ViewerWrapper = styled.div`
  margin: ${spacesL}px 0 ${spacesL}px ${spacesL}px;
  overflow-x: scroll;
`;

export const ViewerBody = styled.div`
  overflow-x: scroll;
`;

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

export const Subtitle = styled.span`
  font-size: 14px;
`;

// export const SecondaryText = styled.p<SecondaryTextProps>`
//   margin-top: ${(props) => (props.secondaryInstructions ? 20 : 0)};
// `;
