import { Classes } from "@blueprintjs/core";
import styled from "@emotion/styled";

export const StyledMenubar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 8px;
  width: 100%;
  & .${Classes.BUTTON_GROUP} {
    flex: 0 0 auto;
  }
`;

export const StyledMenubarRight = styled.div`
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const StyledMenubarRightRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
`;

export const MenubarRightOverflowColumn = styled.div`
  align-self: flex-end;
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  height: fit-content;
  width: fit-content;
  gap: 8px;
`;
