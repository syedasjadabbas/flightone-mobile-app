import { Redirect } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";

/** No homepage on mobile: go straight to Ava or to sign-in. */
export default function Index() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  return <Redirect href={signedIn ? "/ava" : "/login"} />;
}
