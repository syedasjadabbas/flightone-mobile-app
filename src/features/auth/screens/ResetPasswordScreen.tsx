import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { TextLink } from "../components/TextLink";
import { useResetPasswordMutation } from "../api/authApi";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";

/** Opens from `flightone://reset-password?token=…&email=…` or by pasting the code. */
export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [reset, { isLoading, error, data }] = useResetPasswordMutation();
  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.token ?? "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ token, password }) => {
    await reset({ token: token.trim(), password, email: params.email || undefined })
      .unwrap()
      .catch(() => null);
  });

  if (data?.ok) {
    return (
      <AuthShell title="Password updated">
        <Notice
          tone="success"
          message={data.sessionsRevoked ? `${data.message} You've been signed out on other devices.` : data.message}
        />
        <Button label="Sign in" onPress={() => router.replace("/login")} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      footer={<TextLink label="Back to sign in" onPress={() => router.replace("/login")} />}
    >
      {error ? <Notice message={formatApiError(error)} /> : null}
      {params.token ? null : (
        <FormField control={control} name="token" label="Reset code" icon="key-outline" autoCapitalize="none" autoCorrect={false} />
      )}
      <FormField
        control={control}
        name="password"
        label="New password"
        icon="lock-closed-outline"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters."
      />
      <FormField
        control={control}
        name="confirmPassword"
        label="Confirm new password"
        icon="lock-closed-outline"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Update password" onPress={onSubmit} loading={isLoading} />
    </AuthShell>
  );
}
