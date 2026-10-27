import type { ReactNode } from 'react';
import { Appbar } from 'react-native-paper';

type HeaderProps = {
  title?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  children?: ReactNode;
};

export function Header({
  title,
  onBack,
  backAccessibilityLabel = 'Volver atrás',
  children,
}: HeaderProps) {
  return (
    <Appbar.Header elevated mode="small">
      {onBack ? (
        <Appbar.BackAction onPress={onBack} accessibilityLabel={backAccessibilityLabel} />
      ) : null}
      {title ? <Appbar.Content title={title} /> : null}
      {children}
    </Appbar.Header>
  );
}
