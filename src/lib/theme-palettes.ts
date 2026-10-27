export const THEME_PALETTES = [
  {
    id: "default",
    label: "LiU Tentor",
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
  },
  {
    id: "claude",
    label: "Claude",
  },
  {
    id: "everforest",
    label: "Everforest",
  },
  {
    id: "github",
    label: "GitHub",
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
  },
  {
    id: "one",
    label: "One",
  },
  {
    id: "rose-pine",
    label: "Rosé Pine",
  },
  {
    id: "solarized",
    label: "Solarized",
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
  },
  {
    id: "vscode",
    label: "VS Code",
  },
] as const;

export type ThemePalette = (typeof THEME_PALETTES)[number]["id"];

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PALETTES.some((palette) => palette.id === value);
}
