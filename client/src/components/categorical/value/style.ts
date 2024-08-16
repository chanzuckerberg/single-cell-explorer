import styled from "@emotion/styled";
import { Button, Icon } from "@czi-sds/components";
import { gray600 } from "../../theme";

export const InfoButton = styled(Button)`
  padding: 0;
  width: 18px;
  min-width: 18px;
  &:hover {
    background-color: transparent;
  }
`;

export const InfoButtonWrapper = styled.div`
  display: inline-block;
  height: 18px;
  width: 18px;
`;

export const InfoCircle = styled(Icon)`
  width: 12px;
  height: 12px;
  color: ${gray600};
`;
