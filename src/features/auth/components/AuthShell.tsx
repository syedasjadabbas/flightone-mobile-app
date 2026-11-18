import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Card, Screen } from "@/core/components";
import { colors, fonts, space } from "@/core/theme/tokens";

/** Brand header + card used by every sign-in screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <AppText style={styles.wordmark}>FlightOne</AppText>
        <AppText variant="bodySoft">Your AI travel consultant, Ava</AppText>
      </View>
      <Card>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? <AppText variant="bodySoft">{subtitle}</AppText> : null}
        <View style={styles.body}>{children}</View>
      </Card>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: space.xxl },
  brand: { alignItems: "center", gap: space.xs, marginBottom: space.sm },
  wordmark: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  body: { gap: space.md, marginTop: space.sm },
  footer: { alignItems: "center", gap: space.sm },
});
