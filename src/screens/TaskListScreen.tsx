import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Appbar,
  Avatar,
  Button,
  Dialog,
  FAB,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../components/Header';
import { PrimaryButton } from '../components/PrimaryButton';
import { TaskItem } from '../components/TaskItem';
import { useTasks } from '../context/TasksContext';
import { palette } from '../theme/theme';
import type { Task } from '../types/Task';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

const SNACKBAR_DURATION = 4000;

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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
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
    setSnackbarVisible(true);
    clearFeedback();
  }, [isFocused, feedback, clearFeedback]);

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
  };

  const dismissSnackbar = () => setSnackbarVisible(false);

  const openForm = () => navigation.navigate('TaskForm');

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {searching ? (
        <Header onBack={closeSearch} backAccessibilityLabel="Cerrar búsqueda">
          <TextInput
            mode="flat"
            dense
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar tareas"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            accessibilityLabel="Buscar tareas"
          />
          {query.length > 0 ? (
            <Appbar.Action
              icon="close"
              onPress={() => setQuery('')}
              accessibilityLabel="Borrar búsqueda"
            />
          ) : null}
        </Header>
      ) : (
        <Header title="To-do List">
          <Appbar.Action
            icon="magnify"
            onPress={() => setSearching(true)}
            accessibilityLabel="Buscar tareas"
          />
        </Header>
      )}

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
            <Avatar.Icon
              size={96}
              icon="clipboard-text-outline"
              color={palette.onSurfaceVariant}
              style={styles.emptyIcon}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No hay tareas
            </Text>
            <Text variant="bodyMedium" style={styles.emptyBody}>
              No hay tareas pendientes en esta vista. Agrega la primera con el botón inferior.
            </Text>
            <PrimaryButton
              icon="plus"
              label="Crear primera tarea"
              onPress={openForm}
              style={styles.emptyButton}
            />
          </View>
        ) : visibleTasks.length === 0 ? (
          <View style={styles.empty}>
            <Avatar.Icon
              size={96}
              icon="magnify-close"
              color={palette.onSurfaceVariant}
              style={styles.emptyIcon}
            />
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
          icon="plus"
          color={palette.onPrimary}
          customSize={56}
          style={[
            styles.fab,
            { bottom: 16 + insets.bottom + (snackbarVisible ? 72 : 0) },
          ]}
          onPress={openForm}
          accessibilityLabel="Crear nueva tarea"
        />

        <Snackbar
          key={notice?.id}
          visible={snackbarVisible}
          onDismiss={dismissSnackbar}
          duration={SNACKBAR_DURATION}
          wrapperStyle={{ bottom: insets.bottom }}
          action={
            notice?.undo
              ? {
                  label: 'Deshacer',
                  onPress: undoDelete,
                  accessibilityLabel: 'Deshacer eliminación',
                  contentStyle: styles.touchTarget,
                }
              : undefined
          }
        >
          {notice?.message ?? ''}
        </Snackbar>
      </View>

      <Portal>
        <Dialog
          visible={taskToDelete !== null}
          onDismiss={() => setTaskToDelete(null)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="delete" color={palette.tertiary} />
          <Dialog.Title style={styles.dialogTitle}>Eliminar tarea</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              ¿Quieres eliminar "
              <Text variant="bodyMedium" style={styles.dialogEmphasis}>
                {taskToDelete?.titulo}
              </Text>
              "? Podrás deshacer esta acción durante unos segundos.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="text"
              onPress={() => setTaskToDelete(null)}
              contentStyle={styles.touchTarget}
            >
              Cancelar
            </Button>
            <Button
              mode="text"
              textColor={palette.tertiary}
              onPress={confirmDelete}
              contentStyle={styles.touchTarget}
              labelStyle={styles.deleteLabel}
            >
              Eliminar
            </Button>
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
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: palette.surfaceContainer,
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
    borderRadius: 999,
  },
  fab: {
    position: 'absolute',
    right: 16,
    borderRadius: 28,
    backgroundColor: palette.primary,
  },
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
  dialog: {
    borderRadius: 28,
    backgroundColor: palette.surfaceContainerLowest,
  },
  dialogTitle: {
    color: palette.onSurface,
  },
  dialogBody: {
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
  deleteLabel: {
    fontWeight: '600',
  },
});
