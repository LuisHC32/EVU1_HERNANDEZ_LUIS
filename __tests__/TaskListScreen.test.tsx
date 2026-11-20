import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SYNC_MESSAGES } from '../src/constants/messages';
import { TasksProvider, useTasks } from '../src/context/TasksContext';
import { TaskListScreen } from '../src/screens/TaskListScreen';
import * as api from '../src/services/api';
import { setOnline } from '../src/services/network';
import { enqueue, taskPayload } from '../src/services/queue';
import * as storage from '../src/services/storage';
import { theme } from '../src/theme/theme';
import type { RootStackParamList } from '../src/types/navigation';
import type { Task } from '../src/types/Task';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('../src/services/api', () => ({
  apiBase: jest.fn(() => 'http://10.0.0.2:3000'),
  listTaskIds: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

type ListProps = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const pendingTask: Task = {
  id: 't1',
  titulo: 'Pendiente',
  descripcion: 'Subir luego',
  completada: false,
  createdAt: '2026-11-01T00:00:00.000Z',
};

const syncedTask: Task = {
  id: 't2',
  titulo: 'Lista',
  descripcion: 'Ya en servidor',
  completada: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  remoteId: 8,
  syncedAt: '2026-11-01T00:05:00.000Z',
};

function AddTrigger() {
  const { addTask } = useTasks();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar prueba"
      onPress={() => addTask({ titulo: 'Nueva local', descripcion: 'Manual' })}
    />
  );
}

async function renderList() {
  const navigation = { navigate: jest.fn() } as unknown as ListProps['navigation'];
  const route = { key: 'TaskList', name: 'TaskList' as const } as ListProps['route'];

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: () => <Text> </Text>,
        }}
      >
        <TasksProvider>
          <TaskListScreen navigation={navigation} route={route} />
          <AddTrigger />
        </TasksProvider>
      </PaperProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  setOnline(true);
  jest.mocked(api.listTaskIds).mockResolvedValue({ kind: 'ok', ids: [8] });
});

afterEach(() => {
  jest.restoreAllMocks();
  setOnline(true);
});

it('permite sincronizar manualmente una tarea pendiente y una ya sincronizada', async () => {
  await storage.saveTasks([pendingTask, syncedTask]);
  await enqueue({ type: 'create', taskId: pendingTask.id, payload: taskPayload(pendingTask) });
  jest.mocked(api.createTask).mockResolvedValue({ kind: 'ok', remoteId: 21 });
  jest.mocked(api.updateTask).mockResolvedValue({ kind: 'ok' });

  await renderList();

  expect(await screen.findByText('Pendiente')).toBeTruthy();
  expect(api.createTask).not.toHaveBeenCalled();
  expect(screen.queryByText('Sin sincronizar')).toBeNull();
  expect(screen.getByText('1 pendiente')).toBeTruthy();
  expect(screen.getAllByTestId('sync-check-badge')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Sincronizar tarea Pendiente' }).props.accessibilityValue).toEqual({
    text: 'Sin sincronizar',
  });
  expect(screen.getByRole('button', { name: 'Sincronizar tarea Lista' }).props.accessibilityValue).toEqual({
    text: 'Sincronizada',
  });

  await fireEvent.press(screen.getByRole('button', { name: '1 cambio por sincronizar' }));
  expect(await screen.findByText('1 cambio por sincronizar')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar tarea Pendiente' }));

  await waitFor(() => {
    expect(screen.getByText('Tarea sincronizada')).toBeTruthy();
  });
  expect(screen.queryByText('1 pendiente')).toBeNull();
  expect(screen.getAllByTestId('sync-check-badge')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Sincronizar tarea Pendiente' }).props.accessibilityValue).toEqual({
    text: 'Sincronizada',
  });

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar tarea Lista' }));

  await waitFor(() => {
    expect(api.updateTask).toHaveBeenCalledWith(8, taskPayload(syncedTask));
  });
});

it('muestra aviso de error si falla la sincronización manual de una tarea', async () => {
  await storage.saveTasks([pendingTask]);
  await enqueue({ type: 'create', taskId: pendingTask.id, payload: taskPayload(pendingTask) });
  jest.mocked(api.createTask).mockResolvedValue({ kind: 'stop' });

  await renderList();

  await fireEvent.press(await screen.findByRole('button', { name: 'Sincronizar tarea Pendiente' }));

  await waitFor(() => {
    expect(screen.getByText(SYNC_MESSAGES.SYNC_SERVER_ERROR)).toBeTruthy();
  });
  expect(screen.queryByTestId('sync-check-badge')).toBeNull();
});

it('muestra aviso claro al tocar sincronizar sin conexión y en la alerta superior', async () => {
  await storage.saveTasks([pendingTask]);
  await enqueue({ type: 'create', taskId: pendingTask.id, payload: taskPayload(pendingTask) });
  setOnline(false);
  jest.spyOn(NetInfo, 'fetch').mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
  } as Awaited<ReturnType<typeof NetInfo.fetch>>);

  await renderList();

  expect(await screen.findByText('Sin red · 1')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Sin conexión a internet. 1 cambio pendiente; sincronízalo cuando vuelva la conexión.',
    }),
  );
  expect(
    await screen.findByText(
      'Sin conexión a internet. 1 cambio pendiente; sincronízalo cuando vuelva la conexión.',
    ),
  ).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar tarea Pendiente' }));

  await waitFor(() => {
    expect(screen.getByText(SYNC_MESSAGES.SYNC_OFFLINE)).toBeTruthy();
  });
  expect(api.createTask).not.toHaveBeenCalled();
});

it('mantiene el mensaje cuando la API rechaza la tarea (4xx)', async () => {
  await storage.saveTasks([pendingTask]);
  await enqueue({ type: 'create', taskId: pendingTask.id, payload: taskPayload(pendingTask) });
  jest.mocked(api.createTask).mockResolvedValue({ kind: 'drop', status: 400 });

  await renderList();

  await fireEvent.press(await screen.findByRole('button', { name: 'Sincronizar tarea Pendiente' }));

  await waitFor(() => {
    expect(screen.getByText(SYNC_MESSAGES.SYNC_REJECTED)).toBeTruthy();
  });
});

it('quita el check si la tarea ya no está en la API y permite volver a sincronizarla', async () => {
  await storage.saveTasks([syncedTask]);
  jest.mocked(api.listTaskIds).mockResolvedValue({ kind: 'ok', ids: [] });
  jest.mocked(api.createTask).mockResolvedValue({ kind: 'ok', remoteId: 40 });

  await renderList();

  expect(await screen.findByText('Lista')).toBeTruthy();
  await waitFor(() => {
    expect(screen.queryByTestId('sync-check-badge')).toBeNull();
  });

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar tarea Lista' }));

  await waitFor(() => {
    expect(screen.getByText('Tarea sincronizada')).toBeTruthy();
  });
  expect(api.createTask).toHaveBeenCalledWith(taskPayload(syncedTask));
  expect(screen.getByTestId('sync-check-badge')).toBeTruthy();
});

it('al crear una tarea con red queda sin check hasta pulsar sincronizar', async () => {
  jest.mocked(api.listTaskIds).mockResolvedValue({ kind: 'ok', ids: [] });
  jest.mocked(api.createTask).mockResolvedValue({ kind: 'ok', remoteId: 55 });

  await renderList();

  await fireEvent.press(await screen.findByRole('button', { name: 'Agregar prueba' }));

  expect(await screen.findByText('Nueva local')).toBeTruthy();
  expect(api.createTask).not.toHaveBeenCalled();
  expect(screen.queryByText('Sin sincronizar')).toBeNull();
  expect(screen.queryByTestId('sync-check-badge')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar tarea Nueva local' }));

  await waitFor(() => {
    expect(screen.getByText('Tarea sincronizada')).toBeTruthy();
  });
  expect(api.createTask).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('sync-check-badge')).toBeTruthy();
});
