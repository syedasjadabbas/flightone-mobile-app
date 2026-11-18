import { Redirect } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";

/** Signed-in travellers land on Home after the splash; everyone else goes to sign-in. */
export default function Index() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  return <Redirect href={signedIn ? "/home" : "/login"} />;
}
