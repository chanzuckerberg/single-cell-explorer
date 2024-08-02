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
        <StyledBottomBannerWrapper id={BOTTOM_BANNER_ID}>
          <StyledBanner
            dismissible
            sdsType="primary"
            onClose={setBottomBannerLastClosedTime}
            // @ts-expect-error -- czifui Banner component types text prop as astring but the prop works with JSX as well
            text={
              <>
                {BOTTOM_BANNER_SURVEY_TEXT}
                <StyledLink href={surveyLink} target="_blank" rel="noopener">
                  {BOTTOM_BANNER_SURVEY_LINK_TEXT}
                </StyledLink>
              </>
            }
          />
        </StyledBottomBannerWrapper>
      </>
    );
  }
);

export default connect(mapStateToProps, mapDispatchToProps)(BottomBanner);
