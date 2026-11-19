import { StyleSheet, Text, View } from "react-native";
import { Card, TextField } from "@/core/components";
import { space, type } from "@/core/theme/tokens";
import { occupancyText, type HotelGuestsForm as Form, type HotelStay } from "../lib/hotelStay";

/** Every guest by name (per room) plus the lead guest's contact, as RateHawk needs. */
export function HotelGuestsForm({
  stay,
  value,
  onChange,
  disabled,
}: {
  stay: HotelStay;
  value: Form;
  onChange: (next: Form) => void;
  disabled?: boolean;
}) {
  const setGuest = (room: number, guest: number, key: "firstName" | "lastName", text: string) =>
    onChange({
      ...value,
      rooms: value.rooms.map((r, ri) =>
        ri !== room ? r : { guests: r.guests.map((g, gi) => (gi !== guest ? g : { ...g, [key]: text })) },
      ),
    });

  return (
    <Card title="Guest details" subtitle={`${occupancyText(stay.roomGuests)} · names as on passports`} icon="people-outline">
      {value.rooms.map((room, ri) => (
        <View key={ri} style={styles.room}>
          {value.rooms.length > 1 ? <Text style={type.label}>Room {ri + 1}</Text> : null}
          {room.guests.map((g, gi) => (
            <View key={gi} style={styles.guest}>
              <Text style={type.bodySoft}>
                {ri === 0 && gi === 0 ? "Lead guest" : g.isChild ? `Child (age ${g.age})` : `Guest ${gi + 1}`}
              </Text>
              <TextField label="First name" value={g.firstName} onChangeText={(t) => setGuest(ri, gi, "firstName", t)} editable={!disabled} />
              <TextField label="Last name" value={g.lastName} onChangeText={(t) => setGuest(ri, gi, "lastName", t)} editable={!disabled} />
            </View>
          ))}
        </View>
      ))}
      <TextField
        label="Lead guest email"
        value={value.email}
        onChangeText={(t) => onChange({ ...value, email: t })}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!disabled}
      />
      <TextField label="Lead guest phone" value={value.phone} onChangeText={(t) => onChange({ ...value, phone: t })} keyboardType="phone-pad" editable={!disabled} />
      <TextField
        label="Lead guest nationality"
        hint={stay.residency ? `Priced for ${stay.residency.toUpperCase()} passport holders` : "2-letter country code, e.g. PK"}
        value={value.nationality}
        onChangeText={(t) => onChange({ ...value, nationality: t.toUpperCase().slice(0, 2) })}
        autoCapitalize="characters"
        maxLength={2}
        editable={!disabled}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  room: { gap: space.md },
  guest: { gap: space.sm },
});
