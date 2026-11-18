/**
 * "Ava" design tokens, mirrored from the web app's `client/app/fo-ui.css`
 * (`--fo-ui-*`). Keep names aligned so a change there is easy to carry over.
 */
export const colors = {
  bg: "#f2f6fa",
  bgGlow: "#e2eff5",
  ink: "#0b1219",
  inkSoft: "#55606e",
  inkFaint: "#8a94a3",
  accent: "#0a86c0",
  accentSoft: "#e6f3fa",
  success: "#11845b",
  successSoft: "#e7f5ee",
  danger: "#c0392b",
  dangerSoft: "#fdecea",
  line: "rgba(11, 18, 25, 0.08)",
  card: "#ffffff",
  btn: "#0f1720",
  onBtn: "#ffffff",
  /** Dark variant used by the Ava chat sidebar on web. */
  night: "#0b1219",
  nightSoft: "#16202b",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fonts = {
  display: "Sora_700Bold",
  displaySemi: "Sora_600SemiBold",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodySemi: "SpaceGrotesk_600SemiBold",
  bodyBold: "SpaceGrotesk_700Bold",
} as const;

export const type = {
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodySoft: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.ink },
  /** Small uppercase tag text (`.fo-ui-tag`). */
  tag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" as const },
} as const;

/** Soft card shadow, approximating `--fo-ui-shadow`. */
export const shadow = {
  shadowColor: "#0b1219",
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;
