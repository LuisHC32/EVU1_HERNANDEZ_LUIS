import { beforeEach, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TasksProvider, useTasks } from '../src/context/TasksContext';
import { TaskFormScreen } from '../src/screens/TaskFormScreen';
import * as camera from '../src/services/camera';
import * as location from '../src/services/location';
import type { LocationCapture } from '../src/services/location';
import * as storage from '../src/services/storage';
import { theme } from '../src/theme/theme';
import type { RootStackParamList } from '../src/types/navigation';
import type { Task } from '../src/types/Task';

jest.mock('../src/services/camera', () => ({
  takePhoto: jest.fn(),
  pickFromGallery: jest.fn(),
}));

jest.mock('../src/services/location', () => ({
  getCurrentLocation: jest.fn(),
}));

jest.mock('../src/services/storage', () => ({
  loadTasks: jest.fn(),
  saveTasks: jest.fn(),
}));

type FormProps = NativeStackScreenProps<RootStackParamList, 'TaskForm'>;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const existing: Task = {
  id: 't1',
  titulo: 'Vieja',
  descripcion: 'nota',
  completada: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  photoUris: ['file://old.jpg'],
  location: { latitude: 1, longitude: 2, address: 'Casa' },
};

function Probe({ bag }: { bag: { tasks: Task[]; feedback: string | null } }) {
  const { tasks, feedback } = useTasks();
  bag.tasks = tasks;
  bag.feedback = feedback;
  return null;
}

async function renderForm(params?: { taskId?: string }) {
  const bag = { tasks: [] as Task[], feedback: null as string | null };
  const navigation = { goBack: jest.fn() } as unknown as FormProps['navigation'];
  const route = {
    key: 'TaskForm',
    name: 'TaskForm' as const,
    params,
  } as FormProps['route'];

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: () => <Text> </Text>,
        }}
      >
        <TasksProvider>
          <TaskFormScreen navigation={navigation} route={route} />
          <Probe bag={bag} />
        </TasksProvider>
      </PaperProvider>
    </SafeAreaProvider>,
  );

  return { bag, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(storage.loadTasks).mockResolvedValue([]);
  jest.mocked(storage.saveTasks).mockResolvedValue(undefined);
  jest.mocked(camera.takePhoto).mockResolvedValue({ uris: null, reason: 'cancelled' });
  jest.mocked(camera.pickFromGallery).mockResolvedValue({ uris: null, reason: 'cancelled' });
  jest.mocked(location.getCurrentLocation).mockResolvedValue({ location: null, denied: false });
});

async function openNew() {
  const rendered = await renderForm();
  await screen.findByRole('button', { name: 'Guardar tarea' });
  return rendered;
}

it('con permiso de cámara la tarea guarda photoUri', async () => {
  jest.mocked(camera.takePhoto).mockResolvedValue({ uris: ['file://photo.jpg'] });
  jest.mocked(location.getCurrentLocation).mockResolvedValue({
    location: { latitude: 1, longitude: 2 },
    denied: false,
  });
  const { bag } = await openNew();

  await fireEvent.press(screen.getByRole('button', { name: 'Tomar foto' }));
  expect(await screen.findByLabelText('Vista previa de la foto')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Título'), 'Comprar leche');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));

  await waitFor(() => {
    expect(bag.tasks[0]?.photoUris).toEqual(['file://photo.jpg']);
  });
});

it('con permiso de cámara negado avisa y la tarea se guarda sin foto', async () => {
  jest.mocked(camera.takePhoto).mockResolvedValue({ uris: null, reason: 'denied' });
  const { bag } = await openNew();

  await fireEvent.press(screen.getByRole('button', { name: 'Tomar foto' }));
  expect(await screen.findByText(/Permiso de cámara denegado/)).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Título'), 'Sin foto');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));

  await waitFor(() => {
    expect(bag.tasks).toHaveLength(1);
  });
  expect(bag.tasks[0].photoUris).toBeUndefined();
});

it('si se cancela la cámara no cambia photoUri', async () => {
  jest.mocked(storage.loadTasks).mockResolvedValue([existing]);
  jest.mocked(camera.takePhoto).mockResolvedValue({ uris: null, reason: 'cancelled' });
  const { bag } = await renderForm({ taskId: existing.id });
  await screen.findByDisplayValue('Vieja');

  await fireEvent.press(screen.getByRole('button', { name: 'Tomar foto' }));
  await waitFor(() => {
    expect(camera.takePhoto).toHaveBeenCalled();
  });
  expect(screen.getByLabelText('Vista previa de la foto')).toBeTruthy();
  expect(screen.queryByText(/Permiso de cámara denegado/)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Actualizar tarea' }));

  await waitFor(() => {
    expect(bag.feedback).toBe('Tarea actualizada correctamente');
  });
  expect(bag.tasks[0].photoUris).toEqual(['file://old.jpg']);
  expect(bag.tasks[0].location).toEqual(existing.location);
  expect(location.getCurrentLocation).not.toHaveBeenCalled();
});

it('se puede quitar la foto al editar', async () => {
  jest.mocked(storage.loadTasks).mockResolvedValue([existing]);
  const { bag } = await renderForm({ taskId: existing.id });
  await screen.findByDisplayValue('Vieja');

  await fireEvent.press(screen.getByRole('button', { name: 'Quitar foto' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Actualizar tarea' }));

  await waitFor(() => {
    expect(bag.tasks[0]?.photoUris).toBeUndefined();
  });
  expect(bag.tasks[0].location).toEqual(existing.location);
});

it('con gps concedido la tarea nueva guarda la ubicación', async () => {
  const pending = Promise.withResolvers<LocationCapture>();
  jest.mocked(location.getCurrentLocation).mockImplementation(() => pending.promise);
  const { bag, navigation } = await openNew();

  await fireEvent.changeText(screen.getByLabelText('Título'), 'En el mapa');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));
  expect(await screen.findByLabelText('Obteniendo ubicación')).toBeTruthy();

  pending.resolve({
    location: { latitude: -33.45, longitude: -70.66, address: 'Santiago' },
    denied: false,
  });

  await waitFor(() => {
    expect(bag.tasks[0]?.location).toEqual({
      latitude: -33.45,
      longitude: -70.66,
      address: 'Santiago',
    });
  });
  expect(bag.feedback).toBe('Tarea guardada');
  expect(navigation.goBack).toHaveBeenCalled();
});

it('con gps negado o con error la tarea se crea sin ubicación', async () => {
  jest.mocked(location.getCurrentLocation).mockResolvedValue({ location: null, denied: true });
  const denied = await openNew();

  await fireEvent.changeText(screen.getByLabelText('Título'), 'Sin gps');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));

  await waitFor(() => {
    expect(denied.bag.tasks).toHaveLength(1);
  });
  expect(denied.bag.tasks[0].location).toBeUndefined();
  expect(denied.bag.feedback).toBe('Tarea guardada sin ubicación: permiso denegado.');
  expect(denied.navigation.goBack).toHaveBeenCalled();
});

it('si el gps falla la tarea se crea igual', async () => {
  jest.mocked(location.getCurrentLocation).mockResolvedValue({ location: null, denied: false });
  const { bag } = await openNew();

  await fireEvent.changeText(screen.getByLabelText('Título'), 'Error gps');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));

  await waitFor(() => {
    expect(bag.tasks).toHaveLength(1);
  });
  expect(bag.tasks[0].location).toBeUndefined();
  expect(bag.feedback).toBe('Tarea guardada sin ubicación.');
});

it('no pide ubicación si falta el título', async () => {
  await openNew();

  await fireEvent.press(screen.getByRole('button', { name: 'Guardar tarea' }));

  expect(await screen.findByText('El título es obligatorio.')).toBeTruthy();
  expect(location.getCurrentLocation).not.toHaveBeenCalled();
});
