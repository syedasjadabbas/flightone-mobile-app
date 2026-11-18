import { NativeTabs } from "expo-router/native-tabs";
import { TAB_ICONS } from "@/core/theme/tabIcons.generated";
import { colors, fonts } from "@/core/theme/tokens";

/**
 * The bottom bar is the system's own tab bar: Liquid Glass on iOS 26+,
 * frosted bar on older iOS, Material bar on Android. It stays full size while
 * you scroll.
 *
 * Icons are Lucide (same set as the web app): outline when idle, solid when
 * selected. `scripts/build-tab-icons.mjs` renders them to PNGs and embeds them
 * inline (tabIcons.generated.ts) so the bar shows instantly, with no image fetch.
 */
const ICONS = TAB_ICONS;

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.accent} labelStyle={{ fontFamily: fonts.bodySemi, fontSize: 11 }} minimizeBehavior="never">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon src={ICONS.home} renderingMode="template" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ava">
        <NativeTabs.Trigger.Icon src={ICONS.ava} renderingMode="template" />
        <NativeTabs.Trigger.Label>Ava</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="book">
        <NativeTabs.Trigger.Icon src={ICONS.book} renderingMode="template" />
        <NativeTabs.Trigger.Label>Book</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon src={ICONS.trips} renderingMode="template" />
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon src={ICONS.more} renderingMode="template" />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
