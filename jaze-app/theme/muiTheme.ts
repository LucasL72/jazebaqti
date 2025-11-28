import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#050505",
      paper: "#111111",
    },
    primary: {
      main: "#ffffff",
    },
    secondary: {
      main: "#888888",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b3b3b3",
    },
  },
  typography: {
    fontFamily: "'Roboto', system-ui, -apple-system, BlinkMacSystemFont",
  },
});
