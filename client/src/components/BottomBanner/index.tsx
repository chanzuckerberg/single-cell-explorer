import React, { memo } from "react";
import { connect } from "react-redux";
import {
  BOTTOM_BANNER_ID,
  StyledBanner,
  StyledBottomBannerWrapper,
  StyledLink,
} from "./style";
import {
  BANNER_FEEDBACK_SURVEY_LINK,
  BOTTOM_BANNER_NEWSLETTER_LINK,
  BOTTOM_BANNER_NEWSLETTER_LINK_TEXT,
  BOTTOM_BANNER_NEWSLETTER_TEXT,
  BOTTOM_BANNER_SURVEY_LINK_TEXT,
  BOTTOM_BANNER_SURVEY_TEXT,
} from "./constants";
import { AppDispatch, RootState } from "../../reducers";

export interface BottomBannerProps {
  showBottomBanner: boolean;
  dispatch: AppDispatch;
}

const mapStateToProps = (state: RootState) => ({
  showBottomBanner: state.showBottomBanner,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch,
});

function BannerContent(): JSX.Element {
  return (
    <span>
      <span>
        <StyledLink
          href={BOTTOM_BANNER_NEWSLETTER_LINK}
          target="_blank"
          rel="noopener"
        >
          {BOTTOM_BANNER_NEWSLETTER_LINK_TEXT}
        </StyledLink>
        {BOTTOM_BANNER_NEWSLETTER_TEXT}{" "}
      </span>
      <span>
        {BOTTOM_BANNER_SURVEY_TEXT}
        <StyledLink
          href={BANNER_FEEDBACK_SURVEY_LINK}
          target="_blank"
          rel="noopener"
        >
          {BOTTOM_BANNER_SURVEY_LINK_TEXT}
        </StyledLink>
      </span>
    </span>
  );
}

function BottomBanner({
  showBottomBanner,
  dispatch,
}: BottomBannerProps): JSX.Element | null {
  const setBottomBannerLastClosedTime = () => {
    dispatch({
      type: "update bottom banner last closed time",
      time: Date.now(),
    });
  };

  if (!showBottomBanner) return null;

  return (
    <StyledBottomBannerWrapper
      id={BOTTOM_BANNER_ID}
      data-testid={BOTTOM_BANNER_ID}
    >
      <StyledBanner
        dismissible
        sdsType="primary"
        onClose={setBottomBannerLastClosedTime}
      >
        <BannerContent />
      </StyledBanner>
    </StyledBottomBannerWrapper>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(BottomBanner));
