import styled from "@emotion/styled";
import { Button } from "@czi-sds/components";

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
