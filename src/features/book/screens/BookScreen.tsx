import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { airportLabel, iataToPlace, isKnownIata } from "@/core/lib/places";
import { colors, fonts, radius, shadow, space, type } from "@/core/theme/tokens";
import { useTravellerLocation } from "@/features/ava/hooks/useTravellerLocation";
import { AirportSheet, Counter, DateTile, PlaceSheet, Sheet, Tile, Toggle, tap } from "../components/BookParts";
import { allAirports, daysBetween } from "../lib/airports";
import { CABINS, carsQuery, flightQuery, isoDateFromToday, staysQuery } from "../lib/queries";

type Tab = "flights" | "stays" | "cars";
type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "flights", label: "Flights", icon: "airplane" },
  { key: "stays", label: "Stays", icon: "bed" },
  { key: "cars", label: "Cars", icon: "car-sport" },
];
const POPULAR = ["DXB", "IST", "LHR", "JED", "BKK", "DOH"];
const today = () => new Date();

/** Hand the search to Ava as a sentence (same wording as the web's Flights/Stays/Cars pages). */
function askAva(q: string) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  router.navigate({ pathname: "/ava", params: { q } });
}

/** Keep the later date after the earlier one when the earlier moves past it. */
function keepAfter(start: string, end: string, gap: number) {
  return end && end > start ? end : isoDateFromToday(0, new Date(Date.parse(`${start}T00:00:00Z`) + gap * 86_400_000));
}

function SearchButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
      <Ionicons name="sparkles" size={17} color={colors.onBtn} />
      <Text style={styles.searchText}>{label}</Text>
    </Pressable>
  );
}

// ── Flights ─────────────────────────────────────────────────────────────────

function FlightsForm() {
  const { location } = useTravellerLocation();
  const home = location?.iata && isKnownIata(location.iata) ? location.iata : "LHE";
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [origin, setOrigin] = useState<string | null>(null);
  const [destination, setDestination] = useState("DXB");
  const [departureDate, setDepartureDate] = useState(() => isoDateFromToday(7));
  const [returnDate, setReturnDate] = useState(() => isoDateFromToday(14));
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<string>("economy");
  const [sheet, setSheet] = useState<"from" | "to" | "who" | null>(null);
  const from = origin ?? home;

  const swap = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOrigin(destination);
    setDestination(from);
  };
  const onDepart = (d: string) => {
    setDepartureDate(d);
    setReturnDate((r) => keepAfter(d, r, 7));
  };
  const cabinName = cabin === "premium" ? "Premium economy" : cabin[0].toUpperCase() + cabin.slice(1);
  const nights = tripType === "roundtrip" ? daysBetween(departureDate, returnDate) : 0;

  return (
    <View style={styles.card}>
      <Toggle
        options={[
          { value: "roundtrip", label: "Round trip" },
          { value: "oneway", label: "One way" },
        ]}
        value={tripType}
        onChange={setTripType}
      />

      <View>
        <Tile icon="airplane-outline" label="From" value={iataToPlace(from)} sub={airportLabel(from)} onPress={() => setSheet("from")} />
        <View style={styles.gap} />
        <Tile icon="location-outline" label="To" value={iataToPlace(destination)} sub={airportLabel(destination)} onPress={() => setSheet("to")} />
        <Pressable accessibilityRole="button" accessibilityLabel="Swap from and to" onPress={swap} style={({ pressed }) => [styles.swap, pressed && styles.pressed]}>
          <Ionicons name="swap-vertical" size={18} color={colors.onBtn} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <DateTile label="Depart" value={departureDate} onChange={onDepart} minimumDate={today()} />
        {tripType === "roundtrip" ? (
          <DateTile
            label="Return"
            value={returnDate}
            onChange={setReturnDate}
            minimumDate={new Date(`${departureDate}T00:00:00`)}
            sub={nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : undefined}
          />
        ) : (
          <Tile icon="add-circle-outline" label="Return" placeholder="Add return" onPress={() => setTripType("roundtrip")} style={styles.flex} />
        )}
      </View>

      <Tile
        icon="people-outline"
        label="Travellers & cabin"
        value={`${passengers} ${passengers === 1 ? "adult" : "adults"} · ${cabinName}`}
        onPress={() => setSheet("who")}
      />

      <SearchButton
        label="Search flights"
        onPress={() =>
          askAva(flightQuery({ tripType, origin: from, destination, departureDate, returnDate, passengers, cabin }))
        }
      />

      <View style={styles.popular}>
        <Text style={styles.popularTitle}>Popular from {iataToPlace(from)}</Text>
        <View style={styles.chips}>
          {POPULAR.filter((c) => c !== from).slice(0, 5).map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: destination === c }}
              onPress={() => {
                tap();
                setDestination(c);
              }}
              style={[styles.chip, destination === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, destination === c && styles.chipTextOn]}>{iataToPlace(c)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AirportSheet visible={sheet === "from"} title="Flying from" exclude={destination} onClose={() => setSheet(null)} onPick={(a) => (setOrigin(a.code), setSheet(null))} />
      <AirportSheet visible={sheet === "to"} title="Flying to" exclude={from} onClose={() => setSheet(null)} onPick={(a) => (setDestination(a.code), setSheet(null))} />
      <Sheet visible={sheet === "who"} title="Travellers & cabin" onClose={() => setSheet(null)}>
        <Counter label="Adults" sub="12 years and over" value={passengers} min={1} max={9} onChange={setPassengers} />
        <Text style={styles.sheetLabel}>Cabin</Text>
        <View style={styles.chips}>
          {CABINS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ selected: cabin === c }}
              onPress={() => {
                tap();
                setCabin(c);
              }}
              style={[styles.chip, cabin === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, cabin === c && styles.chipTextOn]}>{c === "premium" ? "Premium economy" : c[0].toUpperCase() + c.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        <SearchButton label="Done" onPress={() => setSheet(null)} />
      </Sheet>
    </View>
  );
}

// ── Stays ───────────────────────────────────────────────────────────────────

const CITY_SUGGESTIONS = Array.from(new Set(allAirports().map((a) => a.city)));

function StaysForm() {
  const [destination, setDestination] = useState("Dubai");
  const [checkIn, setCheckIn] = useState(() => isoDateFromToday(7));
  const [checkOut, setCheckOut] = useState(() => isoDateFromToday(10));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [sheet, setSheet] = useState<"where" | "who" | null>(null);
  const nights = daysBetween(checkIn, checkOut);

  return (
    <View style={styles.card}>
      <Tile icon="location-outline" label="Where" value={destination} placeholder="City or hotel" onPress={() => setSheet("where")} />
      <View style={styles.row}>
        <DateTile
          label="Check-in"
          value={checkIn}
          onChange={(d) => {
            setCheckIn(d);
            setCheckOut((o) => keepAfter(d, o, 3));
          }}
          minimumDate={today()}
        />
        <DateTile
          label="Check-out"
          value={checkOut}
          onChange={setCheckOut}
          minimumDate={new Date(Date.parse(`${checkIn}T00:00:00`) + 86_400_000)}
          sub={nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : undefined}
        />
      </View>
      <Tile
        icon="people-outline"
        label="Guests & rooms"
        value={`${guests} ${guests === 1 ? "guest" : "guests"} · ${rooms} ${rooms === 1 ? "room" : "rooms"}`}
        onPress={() => setSheet("who")}
      />
      <SearchButton label="Search stays" onPress={() => askAva(staysQuery({ destination, checkIn, checkOut, guests, rooms }))} />

      <PlaceSheet
        visible={sheet === "where"}
        title="Where are you staying?"
        placeholder="City, area or hotel"
        suggestions={CITY_SUGGESTIONS}
        onClose={() => setSheet(null)}
        onPick={(p) => (setDestination(p), setSheet(null))}
      />
      <Sheet visible={sheet === "who"} title="Guests & rooms" onClose={() => setSheet(null)}>
        <Counter label="Guests" value={guests} min={1} max={10} onChange={setGuests} />
        <Counter label="Rooms" value={rooms} min={1} max={5} onChange={setRooms} />
        <SearchButton label="Done" onPress={() => setSheet(null)} />
      </Sheet>
    </View>
  );
}

// ── Cars ────────────────────────────────────────────────────────────────────

const PICKUP_SUGGESTIONS = allAirports().map((a) => `${a.city} airport (${a.code})`);

function CarsForm() {
  const [city, setCity] = useState("Dubai airport (DXB)");
  const [sameReturn, setSameReturn] = useState(true);
  const [dropoffCity, setDropoffCity] = useState("");
  const [pickupDate, setPickupDate] = useState(() => isoDateFromToday(7));
  const [dropoffDate, setDropoffDate] = useState(() => isoDateFromToday(10));
  const [sheet, setSheet] = useState<"pickup" | "dropoff" | null>(null);
  const days = daysBetween(pickupDate, dropoffDate);

  return (
    <View style={styles.card}>
      <Tile icon="car-outline" label="Pick-up" value={city} placeholder="Airport or city" onPress={() => setSheet("pickup")} />
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Return to the same place</Text>
        <Switch value={sameReturn} onValueChange={(v) => (tap(), setSameReturn(v))} trackColor={{ true: colors.accent, false: colors.line }} />
      </View>
      {!sameReturn ? (
        <Tile icon="flag-outline" label="Drop-off" value={dropoffCity} placeholder="Where are you leaving it?" onPress={() => setSheet("dropoff")} />
      ) : null}
      <View style={styles.row}>
        <DateTile
          label="Pick-up"
          value={pickupDate}
          onChange={(d) => {
            setPickupDate(d);
            setDropoffDate((o) => keepAfter(d, o, 3));
          }}
          minimumDate={today()}
        />
        <DateTile
          label="Drop-off"
          value={dropoffDate}
          onChange={setDropoffDate}
          minimumDate={new Date(`${pickupDate}T00:00:00`)}
          sub={days > 0 ? `${days} day${days === 1 ? "" : "s"}` : undefined}
        />
      </View>
      <SearchButton label="Search cars" onPress={() => askAva(carsQuery({ city, pickupDate, dropoffDate, sameReturn, dropoffCity }))} />
      <Text style={styles.note}>Ava checks live rental partners for your city and dates. She never guesses a price.</Text>

      <PlaceSheet
        visible={sheet === "pickup"}
        title="Pick-up location"
        placeholder="Airport or city"
        suggestions={PICKUP_SUGGESTIONS}
        onClose={() => setSheet(null)}
        onPick={(p) => (setCity(p), setSheet(null))}
      />
      <PlaceSheet
        visible={sheet === "dropoff"}
        title="Drop-off location"
        placeholder="Airport or city"
        suggestions={PICKUP_SUGGESTIONS}
        onClose={() => setSheet(null)}
        onPick={(p) => (setDropoffCity(p), setSheet(null))}
      />
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

/** Book: a quick, tap-only form for flights, stays or cars; Ava runs the live search. */
export function BookScreen() {
  const [tab, setTab] = useState<Tab>("flights");
  // Home's quick actions open a given tab (`/book?tab=stays`): switch when the param
  // arrives, then clear it so the same shortcut works again next time.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [seenTab, setSeenTab] = useState<string | undefined>(undefined);
  if (params.tab !== seenTab) {
    setSeenTab(params.tab);
    if (params.tab === "flights" || params.tab === "stays" || params.tab === "cars") setTab(params.tab);
  }
  useEffect(() => {
    if (params.tab) router.setParams({ tab: undefined });
  }, [params.tab]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View>
          <Text style={type.h1}>Book</Text>
          <Text style={type.bodySoft}>Pick your trip. Ava searches live prices.</Text>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  setTab(t.key);
                }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Ionicons name={on ? t.icon : (`${t.icon}-outline` as IconName)} size={16} color={on ? colors.accent : colors.inkSoft} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "flights" ? <FlightsForm /> : tab === "stays" ? <StaysForm /> : <CarsForm />}

        <Pressable accessibilityRole="button" onPress={() => router.navigate("/ava")} style={({ pressed }) => [styles.askAva, pressed && styles.pressed]}>
          <View style={styles.askIcon}>
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.askTitle}>Rather just say it?</Text>
            <Text style={type.bodySoft}>“Cheapest Dubai trip in December for 2”</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  gap: { height: 6 },
  row: { flexDirection: "row", gap: space.sm },

  tabs: { flexDirection: "row", backgroundColor: "#e6ebf1", borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.card, shadowColor: "#0b1219", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  tabTextOn: { color: colors.ink },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md + 8,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
    shadowOpacity: 0.07,
  },
  swap: {
    position: "absolute",
    right: space.lg,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.btn,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.card,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.btn,
    marginTop: space.xs,
  },
  searchText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.onBtn },

  popular: { gap: space.sm, marginTop: space.xs },
  popularTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { minHeight: 34, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: "center" },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  chipTextOn: { fontFamily: fonts.bodySemi, color: colors.accent },
  sheetLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkFaint, marginTop: space.sm },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  switchText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, textAlign: "center" },

  askAva: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  askIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  askTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
});
