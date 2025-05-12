import { Button } from '@blueprintjs/core'
import { CommonThemeProps } from '@czi-sds/components'
import styled from '@emotion/styled'
import { primary400 } from 'util/theme'

export const ImageToggleWrapper = styled.span`
  margin-left: 8px;
  display: flex;
`

export const ImageDropdownButton = styled(Button)`
  /* (thuang): Make the caret button narrower */
  min-width: 10px;
`

interface ChromatinIconContainerProps extends CommonThemeProps {
  active: boolean
}

export const ChromatinIconContainer = styled.div<ChromatinIconContainerProps>`
  .bp5-icon svg {
    color: ${props => props.active ? primary400 : 'unset'};
  }
`
