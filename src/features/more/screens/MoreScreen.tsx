import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { AppText, Card, Screen } from "@/core/components";
import { colors, fonts, space, type } from "@/core/theme/tokens";

type Item = { title: string; detail: string; href?: Href; soon?: boolean };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Travel",
    items: [
      { title: "Travel Vault", detail: "Passports, visas, tickets and insurance", href: "/vault" },
      { title: "Visa", detail: "Check requirements and track applications", href: "/visa" },
      { title: "Rewards", detail: "Points, tier and referrals", href: "/rewards" },
    ],
  },
  {
    title: "Coming in Phase 6",
    items: [
      { title: "Refunds & changes", detail: "Cancel or change a booking", soon: true },
      { title: "Support", detail: "Talk to a FlightOne consultant", soon: true },
      { title: "Corporate", detail: "Company travel, approvals and policy", soon: true },
      { title: "Groups & MICE", detail: "Group trips and events", soon: true },
    ],
  },
];

export function MoreScreen() {
  return (
    <Screen>
      <AppText variant="h1">More</AppText>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={[type.label, styles.sectionTitle]}>{s.title}</Text>
          <Card style={styles.card}>
            {s.items.map((it, i) => (
              <Pressable
                key={it.title}
                accessibilityRole={it.href ? "button" : undefined}
                accessibilityLabel={it.title}
                accessibilityState={{ disabled: !it.href }}
                disabled={!it.href}
                onPress={() => it.href && router.push(it.href)}
                style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={[type.label, it.soon && styles.soon]}>{it.title}</Text>
                  <Text style={type.bodySoft}>{it.detail}</Text>
                </View>
                <Text style={styles.chevron}>{it.href ? "›" : ""}</Text>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionTitle: { color: colors.inkSoft, marginLeft: space.xs },
  card: { paddingVertical: space.xs, gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: 2 },
  soon: { color: colors.inkSoft },
  chevron: { fontFamily: fonts.bodySemi, fontSize: 22, color: colors.inkFaint },
});
