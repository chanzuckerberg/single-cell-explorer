import { Button } from "@blueprintjs/core";
import styled from "@emotion/styled";

export const ImageToggleWrapper = styled.span`
  margin-left: 8px;
  display: flex;
`;

export const ImageDropdownButton = styled(Button)`
  /* (thuang): Make the caret button narrower */
  min-width: 10px;
`;
