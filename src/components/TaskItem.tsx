import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text } from 'react-native-paper';

import { palette } from '../theme/theme';
import type { Task } from '../types/Task';

type TaskItemProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completada }}
          accessibilityLabel={
            task.completada
              ? `Marcar ${task.titulo} como pendiente`
              : `Marcar ${task.titulo} como completada`
          }
          onPress={() => onToggle(task)}
          style={styles.checkHit}
          android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
        >
          <MaterialIcons
            name={task.completada ? 'check-circle' : 'radio-button-unchecked'}
            size={24}
            color={task.completada ? palette.primary : palette.outline}
          />
        </Pressable>
        <View style={styles.textBlock}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
            {task.titulo}
          </Text>
          {task.descripcion.length > 0 ? (
            <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
              {task.descripcion}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar tarea ${task.titulo}`}
          onPress={() => onEdit(task)}
          style={styles.iconHit}
          android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
        >
          <MaterialIcons name="edit" size={22} color={palette.onSurfaceVariant} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar tarea ${task.titulo}`}
          onPress={() => onDelete(task)}
          style={styles.iconHit}
          android_ripple={{ color: palette.errorContainer, borderless: true, radius: 24 }}
        >
          <MaterialIcons name="delete" size={22} color={palette.tertiary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkHit: {
    width: 48,
    height: 48,
    marginLeft: -8,
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  title: {
    color: palette.onSurface,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  description: {
    marginTop: 8,
    color: palette.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  iconHit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
});
