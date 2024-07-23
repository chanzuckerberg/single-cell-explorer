import React from "react";
import { kebabCase } from "lodash";
import { InfoContainer, InfoWrapper } from "../style";
import {
  ErrorInfo,
  LoadingInfo,
  NoneSelected,
  ShowInfo,
} from "../infoPanelParts";
import { ExtendedInfoProps } from "../types";

function ContainerInfo(props: ExtendedInfoProps) {
  const {
    id,
    name,
    symbol,
    description,
    synonyms,
    references,
    error,
    loading,
    infoType,
    url,
    showWarningBanner = false,
  } = props;

  const infoTypeTag = kebabCase(infoType);

  const wrapperTestId = `${
    infoType === "Gene" ? symbol : name
  }:${infoTypeTag}-info-wrapper`;

  return (
    <InfoWrapper id={`${infoTypeTag}info_wrapper`} data-testid={wrapperTestId}>
      <InfoContainer id={`${infoTypeTag}-info`}>
        {/* Loading */}
        {(name || symbol) && !error && loading && (
          <LoadingInfo name={name} infoType={infoType} />
        )}

        {/* None Selected */}
        {name === "" && error === null && !loading && (
          <NoneSelected infoType={infoType} />
        )}

        {/* Error */}
        {error && <ErrorInfo name={name} infoType={infoType} />}

        {/* Show Info Card for Gen or Cell Type*/}
        {name && !error && !loading && (
          <ShowInfo
            id={id}
            name={name}
            infoType={infoType}
            description={description}
            synonyms={synonyms}
            references={references}
            url={url}
            symbol={symbol ?? undefined}
            showWarningBanner={showWarningBanner}
          />
        )}
      </InfoContainer>
    </InfoWrapper>
  );
}

export default ContainerInfo;
