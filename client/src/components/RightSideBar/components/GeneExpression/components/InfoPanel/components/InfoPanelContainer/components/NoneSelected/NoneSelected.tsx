import React from "react";

import {
  CustomIcon,
  InfoDiv,
  MessageDiv,
  NoGeneSelectedDiv,
} from "../../style";
import { BaseInfoProps } from "../../types";
import { NO_ENTITY_SELECTED, SELECT_GENE_OR_CELL_TYPE } from "../../constants";

export function NoneSelected({
  infoType,
}: {
  infoType: BaseInfoProps["infoType"];
}) {
  return (
    <InfoDiv>
      <NoGeneSelectedDiv>
        <CustomIcon icon="search" size={33} />
        <MessageDiv className="title">
          {NO_ENTITY_SELECTED(infoType)}
        </MessageDiv>
        <MessageDiv>{SELECT_GENE_OR_CELL_TYPE}</MessageDiv>
      </NoGeneSelectedDiv>
    </InfoDiv>
  );
}
