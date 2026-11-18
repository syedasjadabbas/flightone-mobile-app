import { StyleSheet, Text, View } from "react-native";
import { Card, Pill, TextField } from "@/core/components";
import { space, type } from "@/core/theme/tokens";
import type { Companion } from "../api/types";
import { TRAVELLER_TITLES, type TravellerFormData } from "../lib/travellerAutoFill";
import { ChoiceRow } from "./ChoiceRow";

const TITLE_OPTIONS = TRAVELLER_TITLES.map((t) => ({ value: t as string, label: t.charAt(0) + t.slice(1).toLowerCase() }));
const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "X", label: "Unspecified" },
];

/** Flight traveller details, as on the passport. */
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

  return (
    <Card>
      <Text style={type.h3}>Traveller details</Text>
      <Text style={type.bodySoft}>Enter names exactly as they appear on the passport.</Text>

      {companions.length ? (
        <View style={styles.who}>
          <Text style={type.label}>Who's travelling?</Text>
          <View style={styles.row}>
            <Pill label="Me" selected={!value.companionId} onPress={onPickPrimary} />
            {companions.map((c) => (
              <Pill key={c.id} label={c.fullName} selected={value.companionId === c.id} onPress={() => onPickCompanion(c)} />
            ))}
          </View>
        </View>
      ) : null}

      <ChoiceRow
        label="Title"
        options={TITLE_OPTIONS}
        value={value.title?.toUpperCase()}
        onChange={(t) => onChange({ ...value, title: t })}
        disabled={disabled}
      />
      <ChoiceRow
        label="Gender (as on passport)"
        options={GENDER_OPTIONS}
        value={value.gender?.toUpperCase()}
        onChange={(g) => onChange({ ...value, gender: g })}
        disabled={disabled}
      />
      <TextField label="Given name(s)" value={value.givenName} onChangeText={set("givenName")} autoCapitalize="characters" editable={!disabled} />
      <TextField label="Surname" value={value.surname} onChangeText={set("surname")} autoCapitalize="characters" editable={!disabled} />
      <TextField
        label="Email"
        value={value.email}
        onChangeText={set("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!disabled}
      />
      <TextField label="Phone" value={value.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" editable={!disabled} />
      <TextField
        label="Nationality"
        hint="2-letter country code, e.g. PK"
        value={value.nationality}
        onChangeText={(t) => set("nationality")(t.toUpperCase().slice(0, 2))}
        autoCapitalize="characters"
        maxLength={2}
        editable={!disabled}
      />
      <TextField label="Date of birth" hint="YYYY-MM-DD" value={value.dateOfBirth} onChangeText={set("dateOfBirth")} maxLength={10} editable={!disabled} />
      <TextField label="Passport number (optional)" value={value.passportNumber} onChangeText={set("passportNumber")} autoCapitalize="characters" editable={!disabled} />
      <TextField label="Passport expiry (optional)" hint="YYYY-MM-DD" value={value.passportExpiry} onChangeText={set("passportExpiry")} maxLength={10} editable={!disabled} />
    </Card>
  );
}

const styles = StyleSheet.create({
  who: { gap: space.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
