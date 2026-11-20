import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/core/auth/auth.store";
import { useOnboardingStore } from "@/core/onboarding/onboarding.store";

/**
 * Signed-in travellers land on Home after the splash. Everyone else sees the
 * short intro once (first launch on this device), then sign-in.
 */
export default function Index() {
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  const seen = useOnboardingStore((s) => s.seen);
  const load = useOnboardingStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (signedIn) return <Redirect href="/home" />;
  if (seen === null) return null; // still reading; the splash covers this moment
  return <Redirect href={seen ? "/login" : "/welcome"} />;
}
