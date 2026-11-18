import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { create } from "zustand";
import { buildTravellerLocation } from "@/core/lib/geo/buildLocation";
import type { TravellerLocation } from "@/core/lib/geo/types";

type State = { location: TravellerLocation | null; status: "idle" | "asking" | "ready" | "denied" | "failed" };
const useLocationStore = create<State>(() => ({ location: null, status: "idle" }));

/**
 * Where the traveller is, for Ava's origin ("flights from Karachi") and currency.
 * Phone GPS → the phone's own reverse geocoder → the web's place/IATA/currency
 * rules (`lib/geo/buildLocation`). Asked once per app launch; if the traveller
 * says no, Ava falls back to its default origin (Lahore), same as the web.
 */
async function resolveLocation() {
  if (useLocationStore.getState().status !== "idle") return;
  useLocationStore.setState({ status: "asking" });
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      useLocationStore.setState({ status: "denied" });
      return;
    }
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    const { latitude, longitude } = pos.coords;
    let place: Location.LocationGeocodedAddress | undefined;
    if (Platform.OS !== "web") {
      [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    }
    if (!place?.city && !place?.region) {
      useLocationStore.setState({ status: "failed" });
      return;
    }
    useLocationStore.setState({
      status: "ready",
      location: buildTravellerLocation({
        city: place.city ?? place.subregion ?? place.region,
        region: place.region,
        country: place.country,
        countryCode: place.isoCountryCode,
        latitude,
        longitude,
        source: "browser",
      }),
    });
  } catch {
    useLocationStore.setState({ status: "failed" });
  }
}

export function useTravellerLocation() {
  const location = useLocationStore((s) => s.location);
  const status = useLocationStore((s) => s.status);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (asked) return;
    setAsked(true);
    void resolveLocation();
  }, [asked]);
  return { location, status };
}
