import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Dialog, FAB, Portal, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskItem } from '../components/TaskItem';
import { useTasks } from '../context/TasksContext';
import { palette } from '../theme/theme';
import type { Task } from '../types/Task';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

type Notice = {
  id: number;
  message: string;
  undo: { task: Task; index: number } | null;
};

export function TaskListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { tasks, removeTask, restoreTask, toggleCompleted, feedback, clearFeedback } = useTasks();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const pendingUndo = useRef<{ task: Task; index: number } | null>(null);

  const normalizedQuery = normalize(query.trim());
  const visibleTasks = useMemo(() => {
    if (!normalizedQuery) {
      return tasks;
    }
    return tasks.filter((task) =>
      normalize(`${task.titulo} ${task.descripcion}`).includes(normalizedQuery),
    );
  }, [tasks, normalizedQuery]);
  const isFiltering = normalizedQuery.length > 0;
  const activas = tasks.filter((task) => !task.completada).length;

  useEffect(() => {
    if (!isFocused || !feedback) {
      return;
    }
    const undo = feedback === 'Tarea eliminada' ? pendingUndo.current : null;
    pendingUndo.current = null;
    setNotice({ id: Date.now(), message: feedback, undo });
    clearFeedback();
  }, [isFocused, feedback, clearFeedback]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const confirmDelete = () => {
    if (!taskToDelete) {
      return;
    }
    const index = tasks.findIndex((task) => task.id === taskToDelete.id);
    pendingUndo.current = { task: taskToDelete, index };
    removeTask(taskToDelete.id);
    setTaskToDelete(null);
  };

  const undoDelete = () => {
    if (!notice?.undo) {
      return;
    }
    restoreTask(notice.undo.task, notice.undo.index);
    setNotice(null);
  };

  const openForm = () => navigation.navigate('TaskForm');

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        {searching ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar búsqueda"
              onPress={closeSearch}
              style={styles.iconHit}
              android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
            >
              <MaterialIcons name="arrow-back" size={24} color={palette.onSurface} />
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar tareas"
              placeholderTextColor={palette.outline}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
              accessibilityLabel="Buscar tareas"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Borrar búsqueda"
                onPress={() => setQuery('')}
                style={styles.iconHit}
                android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
              >
                <MaterialIcons name="close" size={24} color={palette.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="titleLarge" style={styles.brand}>
              To-do List
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar tareas"
              onPress={() => setSearching(true)}
              style={styles.iconHit}
              android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
            >
              <MaterialIcons name="search" size={24} color={palette.onSurfaceVariant} />
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.subBar}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Tareas
        </Text>
        <View style={styles.counter}>
          <Text variant="labelMedium" style={styles.counterText}>
            {isFiltering
              ? `${visibleTasks.length} resultado${visibleTasks.length === 1 ? '' : 's'}`
              : `${activas} activa${activas === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="assignment" size={64} color={palette.onSurfaceVariant} />
            </View>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No hay tareas
            </Text>
            <Text variant="bodyMedium" style={styles.emptyBody}>
              No hay tareas pendientes en esta vista. Agrega la primera con el botón inferior.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openForm}
              style={styles.emptyButton}
              hitSlop={4}
            >
              <MaterialIcons name="add" size={18} color={palette.onPrimary} />
              <Text variant="labelLarge" style={styles.emptyButtonLabel}>
                Crear primera tarea
              </Text>
            </Pressable>
          </View>
        ) : visibleTasks.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="search-off" size={64} color={palette.onSurfaceVariant} />
            </View>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Sin resultados
            </Text>
            <Text variant="bodyMedium" style={styles.emptyBody}>
              Ninguna tarea coincide con “{query.trim()}”.
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 112 + insets.bottom },
            ]}
            ItemSeparatorComponent={Separator}
            renderItem={({ item }) => (
              <TaskItem
                task={item}
                onToggle={(task) => toggleCompleted(task.id)}
                onEdit={(task) => navigation.navigate('TaskForm', { taskId: task.id })}
                onDelete={setTaskToDelete}
              />
            )}
          />
        )}

        <FAB
          icon={({ color }) => <MaterialIcons name="add" size={28} color={color} />}
          color={palette.onPrimary}
          customSize={56}
          style={[
            styles.fab,
            { bottom: 16 + insets.bottom + (notice ? 72 : 0) },
          ]}
          onPress={openForm}
          accessibilityLabel="Crear nueva tarea"
        />

        {notice ? (
          <View style={[styles.snackbar, { bottom: 16 + insets.bottom }]}>
            <View style={styles.snackbarMessage}>
              <MaterialIcons name="info" size={20} color={palette.inversePrimary} />
              <Text variant="bodyMedium" style={styles.snackbarText}>
                {notice.message}
              </Text>
            </View>
            {notice.undo ? (
              <Pressable
                accessibilityRole="button"
                onPress={undoDelete}
                style={styles.undo}
              >
                <Text variant="labelLarge" style={styles.undoLabel}>
                  Deshacer
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Portal>
        <Dialog
          visible={taskToDelete !== null}
          onDismiss={() => setTaskToDelete(null)}
          style={styles.dialog}
        >
          <Dialog.Content style={styles.dialogContent}>
            <View style={styles.dialogIcon}>
              <MaterialIcons name="delete" size={24} color={palette.tertiary} />
            </View>
            <Text variant="headlineSmall" style={styles.dialogTitle}>
              Eliminar tarea
            </Text>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              ¿Quieres eliminar "
              <Text variant="bodyMedium" style={styles.dialogEmphasis}>
                {taskToDelete?.titulo}
              </Text>
              "? Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTaskToDelete(null)}
              style={styles.dialogButton}
            >
              <Text variant="labelLarge" style={styles.cancelLabel}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              style={styles.dialogButton}
            >
              <Text variant="labelLarge" style={styles.deleteLabel}>
                Eliminar
              </Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  topBar: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    zIndex: 2,
  },
  brand: {
    color: palette.onSurface,
    fontWeight: '400',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: palette.onSurface,
    paddingVertical: 8,
  },
  iconHit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  subBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  sectionTitle: {
    color: palette.onSurface,
    fontWeight: '500',
  },
  counter: {
    backgroundColor: palette.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterText: {
    color: palette.onSecondaryFixed,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: palette.onSurface,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyBody: {
    color: palette.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    letterSpacing: 0.25,
  },
  emptyButton: {
    marginTop: 24,
    minHeight: 40,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyButtonLabel: {
    color: palette.onPrimary,
  },
  fab: {
    position: 'absolute',
    right: 16,
    borderRadius: 28,
    backgroundColor: palette.primary,
  },
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: palette.inverseSurface,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  snackbarMessage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  snackbarText: {
    flex: 1,
    color: palette.inverseOnSurface,
    letterSpacing: 0.25,
  },
  undo: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoLabel: {
    color: palette.inversePrimary,
    fontWeight: '500',
  },
  dialog: {
    borderRadius: 28,
    backgroundColor: palette.surfaceContainerLowest,
  },
  dialogContent: {
    paddingTop: 24,
  },
  dialogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.tertiaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    color: palette.onSurface,
    fontWeight: '400',
  },
  dialogBody: {
    marginTop: 16,
    color: palette.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  dialogEmphasis: {
    fontWeight: '700',
    color: palette.onSurfaceVariant,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  dialogButton: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    color: palette.primary,
  },
  deleteLabel: {
    color: palette.tertiary,
    fontWeight: '600',
  },
});
