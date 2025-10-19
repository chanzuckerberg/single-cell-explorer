import AnnoMatrix from "../../../../annoMatrix/annoMatrix";
import { Genesets } from "../../../../reducers/genesets";
import { Schema } from "../../../../common/types/schema";
import { AppDispatch } from "../../../../reducers";

export interface DownloadProps {
  screenCap: boolean;
  annoMatrix: AnnoMatrix;
  genesets: Genesets;
  schema: Schema;
  dispatch: AppDispatch;
}
