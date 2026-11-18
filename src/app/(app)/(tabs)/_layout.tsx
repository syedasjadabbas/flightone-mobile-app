import { Tabs } from "expo-router";
import { colors, fonts } from "@/core/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="ava" options={{ title: "Ava" }} />
      <Tabs.Screen name="book" options={{ title: "Book" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
