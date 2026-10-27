import type { ComponentProps } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Button>['icon'];
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: PrimaryButtonProps) {
  return (
    <Button
      mode="contained"
      icon={icon}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.button, style]}
      contentStyle={styles.content}
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
  },
  content: {
    minHeight: 48,
    paddingHorizontal: 8,
  },
});
