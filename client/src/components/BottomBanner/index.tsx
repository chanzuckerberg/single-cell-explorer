import React, { memo } from "react";
import { connect } from "react-redux";
import {
  BOTTOM_BANNER_ID,
  StyledBanner,
  StyledBottomBannerWrapper,
  StyledLink,
} from "./style";
import {
  BOTTOM_BANNER_SURVEY_LINK_TEXT,
  BOTTOM_BANNER_SURVEY_TEXT,
} from "./constants";
import { AppDispatch, RootState } from "../../reducers";

export interface BottomBannerProps {
  surveyLink: string;
  showBottomBanner: boolean;
  dispatch: AppDispatch;
}

const mapStateToProps = (state: RootState) => ({
  showBottomBanner: state.showBottomBanner,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch,
});

const getBannerContent = (surveyLink: string): JSX.Element => (
  <span>
    {BOTTOM_BANNER_SURVEY_TEXT}
    <StyledLink href={surveyLink} target="_blank" rel="noopener">
      {BOTTOM_BANNER_SURVEY_LINK_TEXT}
    </StyledLink>
  </span>
);

const BottomBanner = memo(
  ({
    surveyLink,
    showBottomBanner,
    dispatch,
  }: BottomBannerProps): JSX.Element | null => {
    const setBottomBannerLastClosedTime = () => {
      dispatch({
        type: "update bottom banner last closed time",
        time: Date.now(),
      });
    };

    if (!showBottomBanner) return null;

    return (
      <>
        <StyledBottomBannerWrapper
          id={BOTTOM_BANNER_ID}
          data-testid={BOTTOM_BANNER_ID}
        >
          <StyledBanner
            dismissible
            sdsType="primary"
            onClose={setBottomBannerLastClosedTime}
          >
            {getBannerContent(surveyLink)}
          </StyledBanner>
        </StyledBottomBannerWrapper>
      </>
    );
  }
);

export default connect(mapStateToProps, mapDispatchToProps)(BottomBanner);
