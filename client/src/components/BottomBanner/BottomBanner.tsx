import React, { memo } from "react";
import { connect } from "react-redux";

import { AppDispatch, RootState } from "reducers";

import {
  BOTTOM_BANNER_ID,
  StyledBanner,
  StyledBottomBannerWrapper,
  StyledLink,
  HiddenHubspotForm,
} from "./style";
import {
  BOTTOM_BANNER_SURVEY_LINK_TEXT,
  BOTTOM_BANNER_SURVEY_TEXT,
  BANNER_FEEDBACK_SURVEY_LINK,
  BOTTOM_BANNER_NEWSLETTER_LINK_TEXT,
  BOTTOM_BANNER_NEWSLETTER_TEXT,
  FORM_CONTAINER_ID,
} from "./constants";
import { NewsletterSignup } from "./components/NewsletterSignup/NewsletterModal";
import { useConnect } from "./connect";

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

  const { toggleNewsletterSignupModal, newsletterModalIsOpen } = useConnect();

  if (!showBottomBanner) return null;

  return (
    <>
      <HiddenHubspotForm id={FORM_CONTAINER_ID} />
      <StyledBottomBannerWrapper
        id={BOTTOM_BANNER_ID}
        data-testid={BOTTOM_BANNER_ID}
      >
        <StyledBanner
          dismissible
          sdsType="primary"
          onClose={setBottomBannerLastClosedTime}
        >
          <span>
            <span>
              <StyledLink
                onClick={() => {
                  toggleNewsletterSignupModal();
                }}
                data-testid="newsletter-modal-open-button"
              >
                {" "}
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
          </span>{" "}
        </StyledBanner>
        <NewsletterSignup
          isOpen={newsletterModalIsOpen}
          toggleModal={toggleNewsletterSignupModal}
        />
      </StyledBottomBannerWrapper>
    </>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(BottomBanner));
