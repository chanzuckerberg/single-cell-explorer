export interface BaseInfoProps {
  name: string;
  infoType: "Gene" | "Cell Type";
}

export interface ExtendedInfoProps extends BaseInfoProps {
  description: string;
  id: string | null;
  synonyms: string[];
  references: string[];
  url: string;
  symbol?: string;
  showWarningBanner?: boolean;
  error?: string | null;
  loading?: boolean;
  quickList?: string[];
}
