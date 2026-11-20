import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { store } from "@/core/store/store";
import { bootstrapAuth } from "@/core/auth/bootstrap";
import { AnimatedSplash } from "@/core/components/AnimatedSplash";
import { ConnectionBanner } from "@/core/components/ConnectionBanner";
import { colors } from "@/core/theme/tokens";

// Keep the native splash up until the animated splash has drawn the same frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...Ionicons.font,
  });
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    bootstrapAuth().finally(() => setAuthReady(true));
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && authReady;
  const finishSplash = useCallback(() => setSplashDone(true), []);

  // Safety net: never leave the native splash up if the logo image fails to load.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {ready ? (
        <Provider store={store}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            <ConnectionBanner />
          </SafeAreaProvider>
        </Provider>
      ) : null}
      {splashDone ? null : <AnimatedSplash ready={ready} onFinish={finishSplash} />}
    </View>
  );
}
