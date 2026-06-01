import type { OwnerSettings } from "@/types";

const DEFAULT_THEME = {
  accent: "91 95 239",
  accentHover: "79 83 227",
  background: "247 248 252",
  border: "229 231 235",
  foreground: "17 24 39",
  input: "255 255 255",
  muted: "243 244 246",
  mutedForeground: "107 114 128",
  primaryForeground: "255 255 255",
  secondary: "34 197 94",
  secondaryForeground: "255 255 255",
  surface: "255 255 255",
  surfaceMuted: "248 250 252",
  text: "17 24 39",
  textMuted: "107 114 128",
} as const;

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toRgbTriplet(hexColor: string) {
  const normalized = /^#?[0-9a-f]{6}$/i.test(hexColor) ? (hexColor.startsWith("#") ? hexColor : `#${hexColor}`) : "#5B5FEF";
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ] as const;
}

function darkerTriplet([red, green, blue]: readonly [number, number, number], factor = 0.88) {
  return [clampChannel(red * factor), clampChannel(green * factor), clampChannel(blue * factor)] as const;
}

function setThemeClass(target: HTMLElement | null, className: string, enabled: boolean) {
  if (!target) return;
  target.classList.toggle(className, enabled);
}

export function applyOwnerAppearance(settings: OwnerSettings | null) {
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById("root");

  if (!settings) {
    [root, body, appRoot].forEach((target) => {
      setThemeClass(target, "theme-dark", false);
      setThemeClass(target, "reduce-motion", false);
      setThemeClass(target, "compact-layout", false);
    });
    root.style.colorScheme = "light";
    body.style.colorScheme = "light";
    root.style.setProperty("--primary", DEFAULT_THEME.accent);
    root.style.setProperty("--ring", DEFAULT_THEME.accent);
    root.style.setProperty("--accent", DEFAULT_THEME.accent);
    root.style.setProperty("--accent-hover", DEFAULT_THEME.accentHover);
    root.style.setProperty("--secondary", DEFAULT_THEME.secondary);
    root.style.setProperty("--background", DEFAULT_THEME.background);
    root.style.setProperty("--foreground", DEFAULT_THEME.foreground);
    root.style.setProperty("--text", DEFAULT_THEME.text);
    root.style.setProperty("--text-muted", DEFAULT_THEME.textMuted);
    root.style.setProperty("--card", DEFAULT_THEME.surface);
    root.style.setProperty("--surface", DEFAULT_THEME.surface);
    root.style.setProperty("--surface-muted", DEFAULT_THEME.surfaceMuted);
    root.style.setProperty("--muted", DEFAULT_THEME.muted);
    root.style.setProperty("--muted-foreground", DEFAULT_THEME.mutedForeground);
    root.style.setProperty("--border", DEFAULT_THEME.border);
    root.style.setProperty("--input", DEFAULT_THEME.input);
    root.style.setProperty("--primary-foreground", DEFAULT_THEME.primaryForeground);
    root.style.setProperty("--secondary-foreground", DEFAULT_THEME.secondaryForeground);
    return;
  }

  const [red, green, blue] = toRgbTriplet(settings.appearance.accentColor || "#5B5FEF");
  const [hoverRed, hoverGreen, hoverBlue] = darkerTriplet([red, green, blue]);
  const darkMode = settings.appearance.darkMode;

  [root, body, appRoot].forEach((target) => {
    setThemeClass(target, "theme-dark", darkMode);
    setThemeClass(target, "reduce-motion", settings.appearance.reduceMotion);
    setThemeClass(target, "compact-layout", settings.appearance.compactLayout);
  });

  root.style.colorScheme = darkMode ? "dark" : "light";
  body.style.colorScheme = darkMode ? "dark" : "light";

  root.style.setProperty("--primary", `${red} ${green} ${blue}`);
  root.style.setProperty("--ring", `${red} ${green} ${blue}`);
  root.style.setProperty("--accent", `${red} ${green} ${blue}`);
  root.style.setProperty("--accent-hover", `${hoverRed} ${hoverGreen} ${hoverBlue}`);
  root.style.setProperty("--secondary", `${red} ${green} ${blue}`);

  if (darkMode) {
    root.style.setProperty("--background", "11 18 32");
    root.style.setProperty("--foreground", "226 232 240");
    root.style.setProperty("--text", "226 232 240");
    root.style.setProperty("--text-muted", "148 163 184");
    root.style.setProperty("--border", "51 65 85");
    root.style.setProperty("--input", "15 23 42");
    root.style.setProperty("--card", "15 23 42");
    root.style.setProperty("--surface", "15 23 42");
    root.style.setProperty("--surface-muted", "30 41 59");
    root.style.setProperty("--muted", "30 41 59");
    root.style.setProperty("--muted-foreground", "148 163 184");
  } else {
    root.style.setProperty("--background", DEFAULT_THEME.background);
    root.style.setProperty("--foreground", DEFAULT_THEME.foreground);
    root.style.setProperty("--text", DEFAULT_THEME.text);
    root.style.setProperty("--text-muted", DEFAULT_THEME.textMuted);
    root.style.setProperty("--border", DEFAULT_THEME.border);
    root.style.setProperty("--input", DEFAULT_THEME.input);
    root.style.setProperty("--card", DEFAULT_THEME.surface);
    root.style.setProperty("--surface", DEFAULT_THEME.surface);
    root.style.setProperty("--surface-muted", DEFAULT_THEME.surfaceMuted);
    root.style.setProperty("--muted", DEFAULT_THEME.muted);
    root.style.setProperty("--muted-foreground", DEFAULT_THEME.mutedForeground);
  }
}
