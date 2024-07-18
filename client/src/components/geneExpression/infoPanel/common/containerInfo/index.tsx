import React from "react";
import { kebabCase } from "lodash";
import { InfoContainer, InfoWrapper } from "../style";
import { ErrorInfo, LoadingInfo, NoneSelected, ShowInfo } from "../loadingInfo";
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
    entity,
    url,
    showWarningBanner = false,
  } = props;

  const entityTag = kebabCase(entity);

  return (
    <InfoWrapper
      id={`${entityTag}info_wrapper`}
      data-testid={`${id}:${entityTag}-info`}
    >
      <InfoContainer id={`${entityTag}-info`}>
        {/* Loading */}
        {name && !error && loading && (
          <LoadingInfo name={name} entity={entity} />
        )}

        {/* None Selected */}
        {name === "" && error === null && <NoneSelected entity={entity} />}

        {/* Error */}
        {error && <ErrorInfo name={name} entity={entity} />}

        {/* Show Info */}
        {name && !error && !loading && (
          <ShowInfo
            id={id}
            name={name}
            entity={entity}
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
