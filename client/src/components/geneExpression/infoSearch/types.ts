export interface FuzzySortResult {
  target: string;
}

export interface Modifiers {
  active: boolean;
  disabled: boolean;
  matchesPredicate: boolean;
}

export interface RenderItemProps {
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  modifiers: Modifiers;
}

export type Item = string | FuzzySortResult;

export interface Props {
  infoType: string;
  isLoading: boolean | undefined;
  quickList: string[] | undefined;
}
