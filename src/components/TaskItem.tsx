import { StyleSheet, View } from 'react-native';
import { Card, Checkbox, IconButton, Text } from 'react-native-paper';

import { palette } from '../theme/theme';
import type { Task } from '../types/Task';

type TaskItemProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const TOUCH = 48;

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        title={task.titulo}
        titleVariant="titleMedium"
        titleNumberOfLines={1}
        titleStyle={styles.title}
        style={styles.header}
        leftStyle={styles.left}
        left={() => (
          <Checkbox.Android
            status={task.completada ? 'checked' : 'unchecked'}
            onPress={() => onToggle(task)}
            color={palette.primary}
            uncheckedColor={palette.outline}
            hitSlop={6}
            accessibilityLabel={
              task.completada
                ? `Marcar ${task.titulo} como pendiente`
                : `Marcar ${task.titulo} como completada`
            }
          />
        )}
        rightStyle={styles.right}
        right={() => (
          <View style={styles.actions}>
            <IconButton
              icon="pencil"
              iconColor={palette.onSurfaceVariant}
              size={22}
              style={styles.iconButton}
              onPress={() => onEdit(task)}
              accessibilityLabel={`Editar tarea ${task.titulo}`}
            />
            <IconButton
              icon="delete"
              iconColor={palette.tertiary}
              rippleColor={palette.errorContainer}
              size={22}
              style={styles.iconButton}
              onPress={() => onDelete(task)}
              accessibilityLabel={`Eliminar tarea ${task.titulo}`}
            />
          </View>
        )}
      />
      {task.descripcion.length > 0 ? (
        <Card.Content style={styles.content}>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
            {task.descripcion}
          </Text>
        </Card.Content>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 12,
  },
  header: {
    minHeight: 64,
    paddingLeft: 8,
  },
  left: {
    width: TOUCH,
    height: TOUCH,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    marginRight: 4,
  },
  title: {
    color: palette.onSurface,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    margin: 0,
  },
  content: {
    paddingLeft: 8 + TOUCH + 8,
    paddingBottom: 16,
    marginTop: -8,
  },
  description: {
    color: palette.onSurfaceVariant,
    letterSpacing: 0.25,
  },
});
