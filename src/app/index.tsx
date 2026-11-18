import { Redirect } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";

/** Signed-in travellers land on Ava (Home is a tab away); everyone else goes to sign-in. */
export default function Index() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  return <Redirect href={signedIn ? "/ava" : "/login"} />;
}
