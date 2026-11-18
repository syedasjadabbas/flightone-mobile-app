import { AppText } from "./AppText";
import { Card } from "./Card";
import { Screen } from "./Screen";
import { Tag } from "./Pill";

/** Placeholder for screens that land in a later phase. */
export function ComingSoon({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <Screen>
      <AppText variant="h1">{title}</AppText>
      <Card>
        <Tag label={phase} tone="neutral" />
        <AppText variant="bodySoft">{description}</AppText>
      </Card>
    </Screen>
  );
}
