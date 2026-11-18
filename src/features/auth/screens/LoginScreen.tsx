import { useState } from "react";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppText, Button, Notice } from "@/core/components";
import { formatApiError } from "@/core/api/formatApiError";
import { useAuthStore } from "@/core/auth/auth.store";
import { AuthShell } from "../components/AuthShell";
import { TwoFactorSetup } from "../components/TwoFactorSetup";
import { FormField } from "../components/FormField";
import { TextLink } from "../components/TextLink";
import { isTwoFactorChallenge, useLoginMutation, useTwoFactorVerifyMutation, type Login2faChallenge } from "../api/authApi";
import { loginSchema, twoFactorSchema, type LoginValues, type TwoFactorValues } from "../schemas";

export function LoginScreen() {
  const signOutReason = useAuthStore((s) => s.signOutReason);
  const [challenge, setChallenge] = useState<Login2faChallenge | null>(null);

  if (challenge) {
    return <TwoFactorStep challenge={challenge} onBack={() => setChallenge(null)} />;
  }
  return <CredentialsStep signOutReason={signOutReason} onChallenge={setChallenge} />;
}

function CredentialsStep({
  signOutReason,
  onChallenge,
}: {
  signOutReason: string | null;
  onChallenge: (c: Login2faChallenge) => void;
}) {
  const [login, { isLoading, error }] = useLoginMutation();
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await login({ email: values.email.trim(), password: values.password }).unwrap().catch(() => null);
    if (res && isTwoFactorChallenge(res)) onChallenge(res);
    // On success the (auth) layout redirects to the app.
  });

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Ava is ready when you are."
      footer={
        <>
          <TextLink label="Forgot password?" onPress={() => router.push("/forgot-password")} />
          <TextLink label="New to FlightOne? Create an account" onPress={() => router.push("/signup")} />
        </>
      }
    >
      {signOutReason && !error ? <Notice tone="info" message={signOutReason} /> : null}
      {error ? <Notice message={formatApiError(error)} /> : null}
      <FormField
        control={control}
        name="email"
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Sign in" onPress={onSubmit} loading={isLoading} />
    </AuthShell>
  );
}

function TwoFactorStep({ challenge, onBack }: { challenge: Login2faChallenge; onBack: () => void }) {
  const [verify, { isLoading, error }] = useTwoFactorVerifyMutation();
  const [useBackup, setUseBackup] = useState(false);
  const { control, handleSubmit } = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: "" },
  });

  if (challenge.requires2faSetup) {
    return (
      <AuthShell
        title="Set up two-step verification"
        subtitle="Your account needs it before you can sign in."
        footer={<TextLink label="Back to sign in" onPress={onBack} />}
      >
        {/* Confirming with the login's temp token returns a session; the (auth) layout then redirects. */}
        <TwoFactorSetup tempToken={challenge.tempToken} onEnabled={() => {}} />
      </AuthShell>
    );
  }

  const onSubmit = handleSubmit(async ({ code }) => {
    await verify({
      code: code.trim(),
      tempToken: challenge.tempToken,
      type: useBackup ? "backup_code" : "totp",
    })
      .unwrap()
      .catch(() => null);
  });

  return (
    <AuthShell
      title="Two-step verification"
      subtitle={useBackup ? "Enter one of your backup codes." : "Enter the code from your authenticator app."}
      footer={
        <>
          <TextLink
            label={useBackup ? "Use authenticator code" : "Use a backup code"}
            onPress={() => setUseBackup((v) => !v)}
          />
          <TextLink label="Back to sign in" onPress={onBack} />
        </>
      }
    >
      {error ? <Notice message={formatApiError(error)} /> : null}
      <FormField
        control={control}
        name="code"
        label={useBackup ? "Backup code" : "6-digit code"}
        autoCapitalize="none"
        keyboardType={useBackup ? "default" : "number-pad"}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Verify" onPress={onSubmit} loading={isLoading} />
      <AppText variant="bodySoft">{challenge.message}</AppText>
    </AuthShell>
  );
}
