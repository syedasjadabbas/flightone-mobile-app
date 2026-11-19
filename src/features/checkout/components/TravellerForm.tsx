import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Card, DateField, TextField } from "@/core/components";
import { colors, fonts, radius, space } from "@/core/theme/tokens";
import type { Companion } from "../api/types";
import { TRAVELLER_TITLES, type TravellerFormData } from "../lib/travellerAutoFill";
import { ChoiceRow } from "./ChoiceRow";

const TITLE_OPTIONS = TRAVELLER_TITLES.map((t) => ({ value: t as string, label: t.charAt(0) + t.slice(1).toLowerCase() }));
const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "X", label: "Unspecified" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={15} color={colors.inkSoft} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Flight traveller details, as on the passport — grouped into Who / Name / Contact / Passport. */
export function TravellerForm({
  value,
  onChange,
  companions,
  onPickPrimary,
  onPickCompanion,
  disabled,
}: {
  value: TravellerFormData;
  onChange: (next: TravellerFormData) => void;
  companions: Companion[];
  onPickPrimary: () => void;
  onPickCompanion: (c: Companion) => void;
  disabled?: boolean;
}) {
  const set = (key: keyof TravellerFormData) => (text: string) => onChange({ ...value, [key]: text, isAutoFilled: false });
  // Passport fields are optional: keep them tucked away unless already filled.
  const [passportOpen, setPassportOpen] = useState(Boolean(value.passportNumber || value.passportExpiry));
  const showPassport = passportOpen || Boolean(value.passportNumber || value.passportExpiry);
  const pick = (run: () => void) => () => {
    void Haptics.selectionAsync().catch(() => {});
    run();
  };

  return (
    <Card title="Traveller details" subtitle="Names exactly as on the passport" icon="person-outline">
      {companions.length ? (
        <Section icon="people-outline" title="Who's travelling?">
          <View style={styles.people}>
            {[{ id: null as string | null, name: "Me" }, ...companions.map((c) => ({ id: c.id as string | null, name: c.fullName }))].map((p) => {
              const on = p.id === null ? !value.companionId : value.companionId === p.id;
              const companion = companions.find((c) => c.id === p.id);
              return (
                <Pressable
                  key={p.id ?? "me"}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={p.name}
                  disabled={disabled}
                  onPress={pick(() => (companion ? onPickCompanion(companion) : onPickPrimary()))}
                  style={[styles.person, on && styles.personOn]}
                >
                  <View style={[styles.avatar, on && styles.avatarOn]}>
                    {p.id === null ? (
                      <Ionicons name="person" size={14} color={on ? "#fff" : colors.inkSoft} />
                    ) : (
                      <Text style={[styles.avatarText, on && styles.avatarTextOn]}>{initials(p.name)}</Text>
                    )}
                  </View>
                  <Text style={[styles.personName, on && styles.personNameOn]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}

      <Section icon="id-card-outline" title="Name">
        <ChoiceRow label="Title" options={TITLE_OPTIONS} value={value.title?.toUpperCase()} onChange={(t) => onChange({ ...value, title: t })} disabled={disabled} />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Given name(s)" value={value.givenName} onChangeText={set("givenName")} autoCapitalize="characters" editable={!disabled} />
          </View>
          <View style={styles.flex}>
            <TextField label="Surname" value={value.surname} onChangeText={set("surname")} autoCapitalize="characters" editable={!disabled} />
          </View>
        </View>
        <ChoiceRow
          label="Gender (as on passport)"
          options={GENDER_OPTIONS}
          value={value.gender?.toUpperCase()}
          onChange={(g) => onChange({ ...value, gender: g })}
          disabled={disabled}
        />
        <View style={styles.pair}>
          <View style={styles.nat}>
            <TextField
              label="Nationality"
              hint="e.g. PK"
              value={value.nationality}
              onChangeText={(t) => set("nationality")(t.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
              editable={!disabled}
            />
          </View>
          <View style={styles.flex}>
            <DateField label="Date of birth" value={value.dateOfBirth} onChange={set("dateOfBirth")} maximumDate={new Date()} />
          </View>
        </View>
      </Section>

      <Section icon="call-outline" title="Contact">
        <TextField
          label="Email"
          icon="mail-outline"
          value={value.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!disabled}
        />
        <TextField label="Phone" icon="call-outline" value={value.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" editable={!disabled} />
      </Section>

      {showPassport ? (
        <Section icon="book-outline" title="Passport (optional)">
          <TextField
            label="Passport number"
            icon="book-outline"
            value={value.passportNumber}
            onChangeText={set("passportNumber")}
            autoCapitalize="characters"
            editable={!disabled}
          />
          <DateField label="Passport expiry" value={value.passportExpiry} onChange={set("passportExpiry")} optional minimumDate={new Date()} />
        </Section>
      ) : (
        <Pressable accessibilityRole="button" onPress={pick(() => setPassportOpen(true))} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.addText}>Add passport details (optional)</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  section: { gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.inkSoft },
  pair: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  nat: { width: 108 },

  people: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 5,
    paddingRight: 14,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    maxWidth: "100%",
  },
  personOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  avatarOn: { backgroundColor: colors.accent },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkSoft },
  avatarTextOn: { color: "#fff" },
  personName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, flexShrink: 1 },
  personNameOn: { fontFamily: fonts.bodySemi, color: colors.accent },

  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.accent,
    justifyContent: "center",
  },
  addText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
});
