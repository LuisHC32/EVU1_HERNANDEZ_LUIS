import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      disabled={disabled}
      style={styles.button}
      contentStyle={styles.content}
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    borderRadius: 20,
  },
  content: {
    minHeight: 48,
  },
});
