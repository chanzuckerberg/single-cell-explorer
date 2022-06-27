import { createTheme } from "@material-ui/core/styles";
import { defaultAppTheme, makeThemeOptions } from "czifui";

const themeOptions = { ...defaultAppTheme };

const appTheme = makeThemeOptions(themeOptions);

export const theme = createTheme(appTheme);
