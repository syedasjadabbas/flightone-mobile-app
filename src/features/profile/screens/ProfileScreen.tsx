import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppText, Button, Card, Notice, Pill, Screen, Tag } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { useProfileQuery } from "../api/profileApi";
import { DocumentsSection, HistorySection, SecuritySection } from "../components/AccountSections";
import { CompanionsSection, EmergencySection, LoyaltySection } from "../components/PeopleSections";
import { PreferencesSection } from "../components/PreferencesSection";
import { AvatarPicker } from "../components/AvatarPicker";

const SECTIONS = [
  { key: "preferences", label: "Preferences" },
  { key: "companions", label: "Companions" },
  { key: "emergency", label: "Emergency" },
  { key: "loyalty", label: "Loyalty" },
  { key: "documents", label: "Documents" },
  { key: "security", label: "Security" },
  { key: "history", label: "History" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, error, refetch } = useProfileQuery();
  const [logout, logoutState] = useLogoutMutation();
  const [section, setSection] = useState<Section>("preferences");
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const name = profile?.displayName || user?.name || "Traveller";
  const score = profile?.completeness?.score;
  const missing = profile?.completeness?.missing ?? [];

  return (
    <Screen>
      <AppText variant="h1">Profile</AppText>
      <Card>
        <View style={styles.hero}>
          <AvatarPicker name={name} metadata={profile?.metadata} onError={setAvatarError} />
          <View style={styles.flex}>
            <Text style={type.h2}>{name}</Text>
            <Text style={type.bodySoft}>{user?.email}</Text>
          </View>
        </View>
        {avatarError ? <Notice message={avatarError} /> : null}
        {score != null ? (
          <View style={styles.readiness}>
            <View style={styles.readyHead}>
              <Text style={type.label}>Profile readiness</Text>
              <Text style={styles.score}>{Math.round(score)}%</Text>
            </View>
            <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(score) }}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, score))}%` }]} />
            </View>
            {profile?.completeness?.readyForHandsFreeBooking ? (
              <Tag label="Ready for hands-free booking" tone="success" />
            ) : missing.length ? (
              <Text style={type.bodySoft}>Still missing: {missing.map((m) => m.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <>
          <Notice message={formatApiError(error, "We couldn't load your profile.")} />
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {SECTIONS.map((s) => (
          <Pill
            key={s.key}
            label={s.label}
            selected={section === s.key}
            onPress={() => setSection(s.key)}
          />
        ))}
      </ScrollView>

      {section === "preferences" && profile ? <PreferencesSection profile={profile} /> : null}
      {section === "companions" ? <CompanionsSection /> : null}
      {section === "emergency" ? <EmergencySection /> : null}
      {section === "loyalty" ? <LoyaltySection /> : null}
      {section === "documents" ? <DocumentsSection /> : null}
      {section === "security" ? <SecuritySection /> : null}
      {section === "history" ? <HistorySection /> : null}

      <Button label="Sign out" variant="ghost" onPress={() => logout()} loading={logoutState.isLoading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1, gap: 2 },
  readiness: { gap: space.sm },
  readyHead: { flexDirection: "row", justifyContent: "space-between" },
  score: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlow, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  tabs: { gap: space.sm, paddingRight: space.lg },
});
