import styled from "@emotion/styled";
import { Banner, Icon } from "czifui";
import { beta100, beta400, gray500 } from "../theme";

export const SKINNY_MODE_BREAKPOINT_WIDTH = 960;
export const BOTTOM_BANNER_ID = "bottom-banner";

export const StyledBanner = styled(Banner)`
  @media (max-width: ${SKINNY_MODE_BREAKPOINT_WIDTH}px) {
    padding: 8px 16px;
    box-shadow: 0px 0px 4px 0px rgba(50, 50, 50, 0.75);
  }
  span {
    font-family: "Roboto Condensed", "Helvetica Neue", "Helvetica", "Arial",
      sans-serif;
    font-weight: 400;
  }
  /**
   * beta intent does not exist for SDS banner, but the colors do targeting
   * specific id to overwrite style
   */
  border-color: ${beta400} !important;
  background-color: ${beta100};
  color: black;

  /* Hide default svg icon in the Banner as it is not in figma */
  :first-of-type > div:first-of-type > div:first-of-type {
    display: none;
  }

  /* Change close button icon default color */
  button svg {
    path {
      fill: ${gray500};
    }
  }
`;

export const StyledBottomBannerWrapper = styled.div`
  width: 100%;

  /* Right behind modal overlay */
  z-index: 19;
  background-color: purple;
`;

export const StyledLink = styled.a`
  padding: 0px 5px 0px 5px;
  text-decoration-line: underline;
  color: #8f5aff;
  font-weight: 500;

  :hover {
    color: #5826c1;
  }
`;

const STYLED_CLOSE_BUTTON_ICON_DENY_PROPS = ["hideCloseButton"];

export const StyledCloseButtonIcon = styled(Icon, {
  shouldForwardProp: (prop) =>
    !STYLED_CLOSE_BUTTON_ICON_DENY_PROPS.includes(prop),
})``;
