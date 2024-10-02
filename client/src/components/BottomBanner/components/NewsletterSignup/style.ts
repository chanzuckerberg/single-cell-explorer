import styled from "@emotion/styled";
import { Button, Classes, Dialog } from "@blueprintjs/core";
import {
  InputText,
  fontBodyS,
  fontBodyXxxs,
  fontHeaderXl,
} from "@czi-sds/components";
import { error400, gray500 } from "util/theme";

export const NewsletterModal = styled(Dialog)`
  background: white;
  .${Classes.DIALOG_HEADER} {
    display: none !important;
  }
  min-width: 400px !important;
  min-height: 266px !important;
  max-width: 400px !important;
  max-height: 266px !important;
  margin: 0;
  padding: 24px;
  padding-bottom: 24px !important;
`;

export const HeaderContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

export const StyledTitle = styled.div`
  ${fontHeaderXl}
  letter-spacing: -0.019em;
  font-size: 24px !important;
  margin: 0;
  height: auto !important;
  padding-top: 16px;
  padding-bottom: 8px;
`;

export const StyledDescription = styled.div`
  ${fontBodyS}
  letter-spacing: -0.006em;
  padding-bottom: 16px;
`;

export const StyledForm = styled.form`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 34px;
  margin-bottom: 0;
  align-items: center;
  width: 100%;
`;

export const StyledInputText = styled(InputText)`
  .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: #5826c1 !important;
  }
  flex: 1;
  margin-right: 4px;
  margin-bottom: 0px;
  display: inline-flex;
`;

export const StyledSubmitButton = styled(Button)`
  padding: 6px 12px;
  width: 91px;
  height: 34px;
  background: #8f5aff;
  font-weight: 500;
  :hover {
    background: #5826c1;
  }
`;

export const StyledErrorMessage = styled.div`
  ${fontBodyXxxs}
  letter-spacing: -0.005em;
  align-self: flex-start;
  height: 16px;
  margin-top: 4px;
  margin-bottom: 4px;
  color: ${error400};
`;

export const StyledDisclaimer = styled.div`
  ${fontBodyXxxs}
  letter-spacing: -0.005em;

  color: ${gray500};
`;

export const HiddenHubspotForm = styled.div`
  display: none;
`;
