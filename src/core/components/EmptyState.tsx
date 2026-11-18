import { StyleSheet, View } from "react-native";
import { space } from "@/core/theme/tokens";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={styles.card}>
      <AppText variant="h3">{title}</AppText>
      {body ? <AppText variant="bodySoft">{body}</AppText> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "flex-start" },
  action: { alignSelf: "stretch", marginTop: space.sm },
});
