import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { useProfileQuery } from "@/features/profile/api/profileApi";
import { useRewardsSummaryQuery } from "@/features/rewards/api/rewardsApi";

type IconName = keyof typeof Ionicons.glyphMap;
type Tint = { fg: string; bg: string };

// Each area gets its own colour so the menu scans at a glance.
const TINT = {
  blue: { fg: colors.accent, bg: colors.accentSoft },
  green: { fg: colors.success, bg: colors.successSoft },
  amber: { fg: "#b26a00", bg: "#fdf1dc" },
  violet: { fg: "#6a4bd1", bg: "#efeafd" },
  rose: { fg: colors.danger, bg: colors.dangerSoft },
  slate: { fg: "#3d4a5c", bg: "#e9edf2" },
  teal: { fg: "#0f7c86", bg: "#e2f4f5" },
} satisfies Record<string, Tint>;

type Item = { title: string; detail: string; href: Href; icon: IconName; tint: Tint };

const TILES: Item[] = [
  { title: "Travel Vault", detail: "Passports & tickets", href: "/vault", icon: "folder-open", tint: TINT.blue },
  { title: "Visa", detail: "Rules & applications", href: "/visa", icon: "document-text", tint: TINT.green },
  { title: "Rewards", detail: "Points & referrals", href: "/rewards", icon: "diamond", tint: TINT.amber },
  { title: "Concierge", detail: "Disruption help", href: "/concierge", icon: "sparkles", tint: TINT.violet },
];

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Help",
    items: [
      { title: "Refunds & changes", detail: "Refund or cancel a booking, track cases", href: "/refunds", icon: "receipt-outline", tint: TINT.rose },
      { title: "Support", detail: "Answers, or talk to a FlightOne consultant", href: "/support", icon: "chatbubbles-outline", tint: TINT.blue },
    ],
  },
  {
    title: "Business & groups",
    items: [
      { title: "Corporate", detail: "Company profile, approvals and policy", href: "/corporate", icon: "briefcase-outline", tint: TINT.slate },
      { title: "Group travel", detail: "Quotes for 10+ travellers", href: "/groups", icon: "people-outline", tint: TINT.teal },
      { title: "Events & MICE", detail: "Conferences, meetings, incentive trips", href: "/mice", icon: "calendar-outline", tint: TINT.violet },
    ],
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function IconBadge({ icon, tint, size = 36 }: { icon: IconName; tint: Tint; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint.bg }]}>
      <Ionicons name={icon} size={size * 0.52} color={tint.fg} />
    </View>
  );
}

/** More: your account up top, the most used tools as tiles, everything else as tidy grouped rows. */
export function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfileQuery();
  const { data: rewards } = useRewardsSummaryQuery();
  const [logout, logoutState] = useLogoutMutation();

  const name = profile?.displayName || user?.name || "Traveller";
  const meta = (profile?.metadata && typeof profile.metadata === "object" ? profile.metadata : {}) as { avatarUrl?: string };
  const version = Constants.expoConfig?.version;

  const signOut = async () => {
    if (await confirmAction("Sign out?", "You can sign back in any time.", "Sign out")) void logout();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={type.h1}>More</Text>

        {/* Account */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, view profile`}
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [styles.account, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            {meta.avatarUrl ? (
              <Image source={{ uri: meta.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials(name) || "F"}</Text>
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.accountName} numberOfLines={1}>{name}</Text>
            {user?.email ? <Text style={styles.accountEmail} numberOfLines={1}>{user.email}</Text> : null}
            {rewards ? (
              <View style={styles.tierRow}>
                <View style={styles.tier}>
                  <Ionicons name="diamond" size={11} color={colors.night} />
                  <Text style={styles.tierText}>{rewards.tier}</Text>
                </View>
                <Text style={styles.points}>{rewards.balance.toLocaleString()} pts</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Most used */}
        <View style={styles.grid}>
          {TILES.map((t) => (
            <Pressable
              key={t.title}
              accessibilityRole="button"
              accessibilityLabel={t.title}
              onPress={() => router.push(t.href)}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <IconBadge icon={t.icon} tint={t.tint} size={42} />
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>{t.title}</Text>
                <Text style={styles.tileDetail} numberOfLines={1}>{t.detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <View style={styles.group}>
              {s.items.map((it, i) => (
                <Pressable
                  key={it.title}
                  accessibilityRole="button"
                  accessibilityLabel={it.title}
                  onPress={() => router.push(it.href)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <IconBadge icon={it.icon} tint={it.tint} />
                  <View style={[styles.rowBody, i > 0 && styles.divider]}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{it.title}</Text>
                      <Text style={styles.rowDetail} numberOfLines={1}>{it.detail}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={logoutState.isLoading}
          onPress={signOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.rowPressed]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>{logoutState.isLoading ? "Signing out…" : "Sign out"}</Text>
        </Pressable>

        <Text style={styles.version}>FlightOne{version ? ` · v${version}` : ""}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.night,
    borderRadius: radius.md + 6,
    padding: space.lg,
    ...shadow,
    shadowOpacity: 0.2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarImg: { width: 56, height: 56 },
  avatarText: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  accountName: { fontFamily: fonts.display, fontSize: 18, color: "#fff" },
  accountEmail: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  tier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7fd3f7",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, color: colors.night, textTransform: "uppercase" },
  points: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.8)" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md + 2,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
  tileText: { gap: 2 },
  tileTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  tileDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },

  section: { gap: space.sm },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint, marginLeft: space.xs },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: space.lg, gap: space.md },
  rowPressed: { backgroundColor: colors.bg },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md + 2, paddingRight: space.lg, minHeight: 60 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 1 },
  badge: { alignItems: "center", justifyContent: "center" },

  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md + 2,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  signOutText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger },
  version: { textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
});
