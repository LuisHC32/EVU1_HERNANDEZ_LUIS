import { Appbar } from 'react-native-paper';

type HeaderProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
};

export function Header({ title, showBack = false, onBack }: HeaderProps) {
  return (
    <Appbar.Header statusBarHeight={0} elevated>
      {showBack ? (
        <Appbar.BackAction onPress={onBack} accessibilityLabel="Volver" />
      ) : null}
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}
