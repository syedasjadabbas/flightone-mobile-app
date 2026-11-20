import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Notice, SkeletonList } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { confirmAction } from "@/core/lib/confirm";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import {
  useCompanionsQuery,
  useEmergencyContactsQuery,
  useIdentityDocumentsQuery,
  useLoyaltyQuery,
  useProfileQuery,
} from "../api/profileApi";
import { AvatarPicker } from "../components/AvatarPicker";
import { GROUPS, SECTIONS, missingLabel, sectionForMissing, type SectionKey } from "../lib/profileSections";

type IconName = keyof typeof Ionicons.glyphMap;
const ICON: Record<SectionKey, { icon: IconName; fg: string; bg: string }> = {
  preferences: { icon: "person-outline", fg: colors.accent, bg: colors.accentSoft },
  documents: { icon: "card-outline", fg: colors.success, bg: colors.successSoft },
  emergency: { icon: "medkit-outline", fg: colors.danger, bg: colors.dangerSoft },
  companions: { icon: "people-outline", fg: "#6a4bd1", bg: "#efeafd" },
  loyalty: { icon: "ribbon-outline", fg: "#b26a00", bg: "#fdf1dc" },
  history: { icon: "earth-outline", fg: "#0f7c86", bg: "#e2f4f5" },
  security: { icon: "shield-checkmark-outline", fg: "#3d4a5c", bg: "#e9edf2" },
};

const open = (key: SectionKey) => router.push({ pathname: "/profile/[section]", params: { section: key } });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "WINDOW" / "window_seat" → "Window" / "Window seat". */
const nice = (v?: string | null) => (v ? v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : null);

/**
 * Profile hub: who you are and how ready your profile is up top, then grouped
 * rows (with a one-line status each) that open their own screens.
 */
export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isFetching, error, refetch } = useProfileQuery();
  const { data: companions } = useCompanionsQuery();
  const { data: contacts } = useEmergencyContactsQuery();
  const { data: loyalty } = useLoyaltyQuery();
  const { data: docs } = useIdentityDocumentsQuery();
  const [logout, logoutState] = useLogoutMutation();
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const name = profile?.displayName || user?.name || "Traveller";
  const score = profile?.completeness?.score;
  const ready = profile?.completeness?.readyForHandsFreeBooking;
  const missing = profile?.completeness?.missing ?? [];
  const pct = score != null ? Math.max(0, Math.min(100, Math.round(score))) : null;

  const status: Partial<Record<SectionKey, string>> = {
    preferences: [nice(profile?.seatPref), nice(profile?.mealPref)].filter(Boolean).join(" · ") || undefined,
    documents: docs ? (docs.length ? plural(docs.length, "document") : "None yet") : undefined,
    emergency: contacts ? (contacts.length ? plural(contacts.length, "contact") : "None yet") : undefined,
    companions: companions ? (companions.length ? plural(companions.length, "person", "people") : "None yet") : undefined,
    loyalty: loyalty ? (loyalty.length ? plural(loyalty.length, "programme") : "None yet") : undefined,
    security: user?.twoFactorEnabled ? "2-step on" : "2-step off",
  };
  // Rows the server says still need something get a dot.
  const needs = new Set(missing.map(sectionForMissing));

  const signOut = async () => {
    if (await confirmAction("Sign out?", "You can sign back in any time.", "Sign out")) void logout();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.accent} />}
    >
      <Stack.Screen options={{ title: "Profile" }} />

      <View style={styles.hero}>
        <AvatarPicker name={name} metadata={profile?.metadata} onError={setAvatarError} />
        <Text style={styles.name}>{name}</Text>
        {user?.email ? <Text style={type.bodySoft}>{user.email}</Text> : null}
        {avatarError ? <Notice message={avatarError} /> : null}

        {pct != null ? (
          <View style={styles.ready}>
            <View style={styles.readyHead}>
              <Text style={styles.readyTitle}>{ready ? "Ready for hands-free booking" : "Profile readiness"}</Text>
              <Text style={styles.readyPct}>{pct}%</Text>
            </View>
            <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
              <View style={[styles.fill, ready && styles.fillDone, { width: `${pct}%` }]} />
            </View>
            {ready ? (
              <Text style={styles.readyNote}>Ava can book for you without asking for details.</Text>
            ) : missing.length ? (
              <View style={styles.todo}>
                {missing.slice(0, 4).map((m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${missingLabel(m)}`}
                    onPress={() => open(sectionForMissing(m))}
                    style={({ pressed }) => [styles.todoChip, pressed && styles.pressed]}
                  >
                    <Ionicons name="add" size={14} color={colors.accent} />
                    <Text style={styles.todoText}>{missingLabel(m)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {isLoading ? <SkeletonList count={4} /> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Notice message={formatApiError(error, "We couldn't load your profile.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </View>
      ) : null}

      {GROUPS.map((g) => (
        <View key={g.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{g.title}</Text>
          <View style={styles.group}>
            {g.keys.map((k, i) => {
              const ic = ICON[k];
              return (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityLabel={`${SECTIONS[k].title}${status[k] ? `, ${status[k]}` : ""}${needs.has(k) ? ", needs attention" : ""}`}
                  onPress={() => open(k)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={[styles.badge, { backgroundColor: ic.bg }]}>
                    <Ionicons name={ic.icon} size={19} color={ic.fg} />
                  </View>
                  <View style={[styles.rowBody, i > 0 && styles.divider]}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{SECTIONS[k].title}</Text>
                      <Text style={styles.rowDetail} numberOfLines={1}>
                        {status[k] ?? SECTIONS[k].detail}
                      </Text>
                    </View>
                    {needs.has(k) ? <View style={styles.dot} /> : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        disabled={logoutState.isLoading}
        onPress={signOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.rowPressed]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.signOutText}>{logoutState.isLoading ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },

  hero: {
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.md + 10,
    padding: space.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.07,
  },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: space.sm },
  ready: { alignSelf: "stretch", gap: space.sm, marginTop: space.lg },
  readyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  readyTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  readyPct: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlow, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  fillDone: { backgroundColor: colors.success },
  readyNote: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  todo: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  todoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  todoText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.accent },
  errorBox: { gap: space.sm },

  section: { gap: space.sm },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkFaint, marginLeft: space.xs },
  group: { backgroundColor: colors.card, borderRadius: radius.md + 2, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: space.lg, gap: space.md },
  rowPressed: { backgroundColor: colors.bg },
  badge: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md + 2, paddingRight: space.lg, minHeight: 62 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },

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
});
