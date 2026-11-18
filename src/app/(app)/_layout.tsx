import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors, fonts } from "@/core/theme/tokens";

/** Signed-in area. Without a session, go to login (it shows the server's reason). */
export default function AppLayout() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  if (!signedIn) return <Redirect href="/login" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily: fonts.displaySemi, color: colors.ink },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
