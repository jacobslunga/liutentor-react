import type { ThemeRegistration } from "shiki/core";

type CodePalette = {
  foreground: string;
  background: string;
  primary: string;
  variable: string;
  comment: string;
  string: string;
  number: string;
  function: string;
  type: string;
  invalid: string;
};

function createCodeTheme(
  name: string,
  type: "light" | "dark",
  palette: CodePalette,
): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      "editor.foreground": palette.foreground,
      "editor.background": palette.background,
    },
    tokenColors: [
      // Python leaves ordinary names (including imported aliases like np)
      // unscoped. Color its base scope; specific syntax rules below take priority.
      {
        scope: [
          "source.python",
          "variable",
          "entity.name.namespace",
          "support.variable",
        ],
        settings: { foreground: palette.variable },
      },
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: palette.comment },
      },
      {
        scope: ["string", "markup.inline.raw"],
        settings: { foreground: palette.string },
      },
      {
        scope: [
          "constant.numeric",
          "constant.language",
          "constant.character",
          "support.constant",
        ],
        settings: { foreground: palette.number },
      },
      {
        scope: [
          "entity.name.function",
          "support.function",
          "variable.function",
          "meta.function-call.generic.python",
        ],
        settings: { foreground: palette.function },
      },
      {
        scope: [
          "entity.name.type",
          "entity.name.class",
          "support.type",
          "support.class",
        ],
        settings: { foreground: palette.type },
      },
      {
        scope: ["entity.other.attribute-name"],
        settings: { foreground: palette.string },
      },
      {
        scope: ["keyword", "storage", "entity.name.tag"],
        settings: { foreground: palette.primary },
      },
      // Punctuation and operators stay neutral; plain output uses editor.foreground.
      {
        scope: ["punctuation", "keyword.operator"],
        settings: { foreground: palette.foreground },
      },
      { scope: ["invalid"], settings: { foreground: palette.invalid } },
    ],
  };
}

// Primary colors are the sRGB equivalents of --brand in src/index.css.
// The supporting hues pair greens/teals with blue and warm amber accents.
export const chatCodeLight = createCodeTheme("liutentor-light", "light", {
  foreground: "#222222",
  background: "#f7f7f7",
  primary: "#179c7e",
  variable: "#7F5D99",
  comment: "#606b65",
  string: "#426b32",
  number: "#925314",
  function: "#176eaa",
  type: "#66558f",
  invalid: "#b42338",
});

export const chatCodeDark = createCodeTheme("liutentor-dark", "dark", {
  foreground: "#f5f5f5",
  background: "#292929",
  primary: "#a5d8a5",
  variable: "#cbaee5",
  comment: "#a1aea6",
  string: "#c2d69a",
  number: "#e9bd85",
  function: "#8dcafa",
  type: "#c4b8e2",
  invalid: "#ff9aa8",
});
