import { colors } from "@/core/theme/tokens";

/** Icon-badge colour pairs shared by cards, rows and page headers (same set as the More menu). */
export const TINT = {
  blue: { fg: colors.accent, bg: colors.accentSoft },
  green: { fg: colors.success, bg: colors.successSoft },
  amber: { fg: "#b26a00", bg: "#fdf1dc" },
  violet: { fg: "#6a4bd1", bg: "#efeafd" },
  rose: { fg: colors.danger, bg: colors.dangerSoft },
  slate: { fg: "#3d4a5c", bg: "#e9edf2" },
  teal: { fg: "#0f7c86", bg: "#e2f4f5" },
} as const;

export type TintName = keyof typeof TINT;
