import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppText, Button, Card, Notice, Pill, Screen, TextField } from "@/core/components";
import { colors, fonts, radius, space, type } from "@/core/theme/tokens";
import { ChoiceRow } from "@/features/checkout/components/ChoiceRow";
import { AIRPORTS, CABINS, carsQuery, flightQuery, isIsoDate, isoDateFromToday, staysQuery } from "../lib/queries";

type Tab = "flights" | "stays" | "cars";

/** Hand the search to Ava as a sentence (same as the web's Flights/Stays/Cars pages). */
function askAva(q: string) {
  router.navigate({ pathname: "/ava", params: { q } });
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onPress={() => onChange(value - 1)} style={[styles.stepBtn, value <= min && styles.off]}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`More ${label.toLowerCase()}`} disabled={value >= max} onPress={() => onChange(value + 1)} style={[styles.stepBtn, value >= max && styles.off]}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AirportPicker({ label, value, onChange, exclude }: { label: string; value: string; onChange: (c: string) => void; exclude?: string }) {
  return (
    <View style={styles.stepper}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.wrapRow}>
        {AIRPORTS.filter((a) => a.code !== exclude).map((a) => (
          <Pill key={a.code} label={`${a.city} ${a.code}`} selected={value === a.code} onPress={() => onChange(a.code)} />
        ))}
      </View>
    </View>
  );
}

function FlightsForm() {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [origin, setOrigin] = useState("LHE");
  const [destination, setDestination] = useState("DXB");
  const [departureDate, setDepartureDate] = useState(() => isoDateFromToday(7));
  const [returnDate, setReturnDate] = useState(() => isoDateFromToday(18));
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<string>("economy");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!isIsoDate(departureDate) || (tripType === "roundtrip" && !isIsoDate(returnDate))) {
      return setError("Use dates like 2026-12-09.");
    }
    if (tripType === "roundtrip" && returnDate < departureDate) return setError("Return must be after departure.");
    setError(null);
    askAva(flightQuery({ tripType, origin, destination, departureDate, returnDate, passengers, cabin }));
  };

  return (
    <Card>
      <ChoiceRow
        label="Trip"
        options={[
          { value: "roundtrip", label: "Round trip" },
          { value: "oneway", label: "One way" },
        ]}
        value={tripType}
        onChange={setTripType}
      />
      <AirportPicker label="From" value={origin} onChange={setOrigin} exclude={destination} />
      <Button
        label="⇄ Swap"
        variant="ghost"
        onPress={() => {
          setOrigin(destination);
          setDestination(origin);
        }}
      />
      <AirportPicker label="To" value={destination} onChange={setDestination} exclude={origin} />
      <TextField label="Departure" hint="YYYY-MM-DD" value={departureDate} onChangeText={setDepartureDate} maxLength={10} />
      {tripType === "roundtrip" ? (
        <TextField label="Return" hint="YYYY-MM-DD" value={returnDate} onChangeText={setReturnDate} maxLength={10} />
      ) : null}
      <Stepper label="Passengers" value={passengers} min={1} max={9} onChange={setPassengers} />
      <ChoiceRow label="Cabin" options={CABINS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))} value={cabin} onChange={setCabin} />
      {error ? <Notice message={error} /> : null}
      <Button label="Search flights with Ava" onPress={submit} />
    </Card>
  );
}

function StaysForm() {
  const [destination, setDestination] = useState("Dubai, UAE");
  const [checkIn, setCheckIn] = useState(() => isoDateFromToday(7));
  const [checkOut, setCheckOut] = useState(() => isoDateFromToday(10));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!destination.trim()) return setError("Where are you staying?");
    if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return setError("Use dates like 2026-12-09.");
    if (checkOut <= checkIn) return setError("Check-out must be after check-in.");
    setError(null);
    askAva(staysQuery({ destination: destination.trim(), checkIn, checkOut, guests, rooms }));
  };

  return (
    <Card>
      <TextField label="Destination" value={destination} onChangeText={setDestination} />
      <TextField label="Check-in" hint="YYYY-MM-DD" value={checkIn} onChangeText={setCheckIn} maxLength={10} />
      <TextField label="Check-out" hint="YYYY-MM-DD" value={checkOut} onChangeText={setCheckOut} maxLength={10} />
      <Stepper label="Guests" value={guests} min={1} max={10} onChange={setGuests} />
      <Stepper label="Rooms" value={rooms} min={1} max={5} onChange={setRooms} />
      {error ? <Notice message={error} /> : null}
      <Button label="Search stays with Ava" onPress={submit} />
    </Card>
  );
}

function CarsForm() {
  const [city, setCity] = useState("Dubai Intl Airport (DXB)");
  const [sameReturn, setSameReturn] = useState(true);
  const [dropoffCity, setDropoffCity] = useState("");
  const [pickupDate, setPickupDate] = useState(() => isoDateFromToday(7));
  const [dropoffDate, setDropoffDate] = useState(() => isoDateFromToday(10));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!city.trim()) return setError("Where are you picking up?");
    if (!isIsoDate(pickupDate) || !isIsoDate(dropoffDate)) return setError("Use dates like 2026-12-09.");
    if (dropoffDate < pickupDate) return setError("Drop-off must be after pick-up.");
    setError(null);
    askAva(carsQuery({ city: city.trim(), pickupDate, dropoffDate, sameReturn, dropoffCity }));
  };

  return (
    <Card>
      <TextField label="Pick-up location" value={city} onChangeText={setCity} />
      <ChoiceRow
        label="Return"
        options={[
          { value: "same", label: "Same location" },
          { value: "other", label: "Different location" },
        ]}
        value={sameReturn ? "same" : "other"}
        onChange={(v) => setSameReturn(v === "same")}
      />
      {!sameReturn ? <TextField label="Drop-off location" value={dropoffCity} onChangeText={setDropoffCity} /> : null}
      <TextField label="Pick-up date" hint="YYYY-MM-DD" value={pickupDate} onChangeText={setPickupDate} maxLength={10} />
      <TextField label="Drop-off date" hint="YYYY-MM-DD" value={dropoffDate} onChangeText={setDropoffDate} maxLength={10} />
      {error ? <Notice message={error} /> : null}
      <Button label="Search cars with Ava" onPress={submit} />
      <Text style={type.bodySoft}>Ava checks live rental partners for your city and dates — she never guesses a price.</Text>
    </Card>
  );
}

export function BookScreen() {
  const [tab, setTab] = useState<Tab>("flights");
  return (
    <Screen>
      <AppText variant="h1">Book</AppText>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["flights", "stays", "cars"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityLabel={t[0].toUpperCase() + t.slice(1)}
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t[0].toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "flights" ? <FlightsForm /> : tab === "stays" ? <StaysForm /> : <CarsForm />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  tab: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: colors.ink },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  tabTextOn: { color: colors.onBtn },
  stepper: { gap: space.xs },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  stepBtn: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 20, color: colors.ink },
  stepValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, minWidth: 24, textAlign: "center" },
  off: { opacity: 0.35 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
