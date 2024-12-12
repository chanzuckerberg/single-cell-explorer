import { AppDispatch, GetState } from "../../reducers";

export interface ToolParameter {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "array";
}

export interface ToolConfig {
  name: string;
  description: string;
  parameters?: ToolParameter[];
  action: ActionFunction;
}

export type ActionFunction = (
  dispatch: AppDispatch,
  getState: GetState,
  args?: Record<string, string>
) => Promise<string>;
