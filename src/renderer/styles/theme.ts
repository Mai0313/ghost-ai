export type RGB = [number, number, number];

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;

  return value;
}

export function rgba(rgb: RGB, alpha: number): string {
  const [r, g, b] = rgb;

  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

export interface ThemeSpec {
  opacity: number;
  fontFamily: string;
  palette: {
    text: RGB;
    mutedText: RGB;
    barBg: RGB;
    settingsBg: RGB;
    panelBg: RGB;
    panelFooterBg: RGB;
    inputBg: RGB;
    border: RGB;
    shadow: RGB;
    primary: RGB;
    danger: RGB;
  };
  color: {
    text: (multiplier?: number) => string;
    muted: (multiplier?: number) => string;
    barBg: (multiplier?: number) => string;
    settingsBg: (multiplier?: number) => string;
    panelBg: (multiplier?: number) => string;
    panelFooterBg: (multiplier?: number) => string;
    inputBg: (multiplier?: number) => string;
    border: (multiplier?: number, base?: number) => string;
    primary: (multiplier?: number, base?: number) => string;
    danger: (multiplier?: number, base?: number) => string;
    shadow: (multiplier?: number, base?: number) => string;
    shadowStrong: (multiplier?: number, base?: number) => string;
  };
  shadow: {
    bar: () => string;
    panel: () => string;
    panelStrong: () => string;
  };
}

export function makeTheme(opacity = 0.85): ThemeSpec {
  const palette = {
    text: [255, 255, 255] as RGB,
    mutedText: [189, 189, 189] as RGB, // #BDBDBD
    barBg: [30, 30, 30] as RGB,
    settingsBg: [20, 20, 20] as RGB,
    panelBg: [22, 22, 22] as RGB,
    panelFooterBg: [24, 24, 24] as RGB,
    inputBg: [22, 22, 22] as RGB, // close to #161616 visually with opacity
    border: [255, 255, 255] as RGB,
    shadow: [0, 0, 0] as RGB,
    primary: [43, 102, 246] as RGB, // #2B66F6
    danger: [255, 40, 40] as RGB,
  };

  const color = {
    text: (multiplier = 1) => rgba(palette.text, opacity * multiplier),
    muted: (multiplier = 1) => rgba(palette.mutedText, opacity * multiplier),
    barBg: (multiplier = 1) => rgba(palette.barBg, opacity * multiplier),
    settingsBg: (multiplier = 1) => rgba(palette.settingsBg, opacity * multiplier),
    panelBg: (multiplier = 1) => rgba(palette.panelBg, opacity * multiplier),
    panelFooterBg: (multiplier = 1) => rgba(palette.panelFooterBg, opacity * multiplier),
    inputBg: (multiplier = 1) => rgba(palette.inputBg, opacity * multiplier),
    border: (multiplier = 1, base = 0.08) => rgba(palette.border, base * opacity * multiplier),
    primary: (multiplier = 1, base = 1) => rgba(palette.primary, base * opacity * multiplier),
    danger: (multiplier = 1, base = 0.9) => rgba(palette.danger, base * opacity * multiplier),
    shadow: (multiplier = 1, base = 0.35) => rgba(palette.shadow, base * opacity * multiplier),
    shadowStrong: (multiplier = 1, base = 0.45) =>
      rgba(palette.shadow, base * opacity * multiplier),
  };

  return {
    opacity,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    palette,
    color,
    shadow: {
      bar: () => `0 8px 24px ${color.shadow()}`,
      panel: () => `0 10px 30px ${color.shadow()}`,
      panelStrong: () => `0 10px 30px ${color.shadowStrong()}`,
    },
  };
}

export const theme = makeTheme();
