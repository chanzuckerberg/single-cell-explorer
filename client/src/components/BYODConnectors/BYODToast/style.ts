import styled from "@emotion/styled";
import { fontBodyS, Button } from "@czi-sds/components";

export const StyledToast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  min-width: 300px;

  @media (max-width: 768px) {
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: none;
  }

  /* Set background color to primary100 */
  .MuiAlert-root {
    background-color: #EBF5FF;
  }

  /* Remove default padding and margin from MuiAlert-message with higher specificity */
  .MuiAlert-root .MuiAlert-message {
    padding: 0;
  }

  /* Remove default margin from all children in MuiAlert-message with higher specificity */
  .MuiAlert-root .MuiAlert-message > * {
    margin: 0;
  }
`;

export const StyledMessage = styled.p`
  ${fontBodyS}
  line-height: 1.4;
  margin: 0 0 8px 0;
`;

export const StyledButton = styled(Button)`
  margin-top: 8px;
`;
