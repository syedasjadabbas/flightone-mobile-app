import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";
import { colors } from "@/core/theme/tokens";

/** Sign-in screens: bounce to the app once a session exists. */
export default function AuthLayout() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  if (signedIn) return <Redirect href="/ava" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
