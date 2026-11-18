import { AppText, Button, Card, Screen, Tag } from "@/core/components";
import { useAuthStore } from "@/core/auth/auth.store";
import { useLogoutMutation } from "@/features/auth/api/authApi";

/** Minimal profile until Phase 5: who is signed in, and sign out. */
export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [logout, { isLoading }] = useLogoutMutation();

  return (
    <Screen>
      <AppText variant="h1">Profile</AppText>
      <Card>
        <AppText variant="h3">{user?.name || "Traveller"}</AppText>
        <AppText variant="bodySoft">{user?.email}</AppText>
        {user?.twoFactorEnabled ? <Tag label="2-step on" tone="success" /> : null}
      </Card>
      <Button label="Sign out" variant="ghost" onPress={() => logout()} loading={isLoading} />
    </Screen>
  );
}
