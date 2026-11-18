import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "@/core/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

/** Filled icon when the tab is active, outline otherwise. */
function tabIcon(name: string) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={(focused ? name : `${name}-outline`) as IconName} color={color as string} size={size - 2} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: tabIcon("planet") }} />
      <Tabs.Screen name="ava" options={{ title: "Ava", tabBarIcon: tabIcon("chatbubble-ellipses") }} />
      <Tabs.Screen name="book" options={{ title: "Book", tabBarIcon: tabIcon("airplane") }} />
      <Tabs.Screen name="trips" options={{ title: "Trips", tabBarIcon: tabIcon("map") }} />
      {/* Profile opens from Home's avatar and the More menu; hidden from the bar to keep it at five tabs. */}
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("grid") }} />
    </Tabs>
  );
}
