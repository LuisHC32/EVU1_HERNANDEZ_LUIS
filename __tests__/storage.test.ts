import { beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadTasks, saveTasks } from '../src/services/storage';
import type { Task } from '../src/types/Task';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const task: Task = {
  id: 'a',
  titulo: 'Comprar',
  descripcion: 'leche',
  completada: false,
  createdAt: '2026-11-06T00:00:00.000Z',
  photoUris: ['file://photo.jpg', 'file://b.jpg'],
  location: { latitude: -33.45, longitude: -70.66, address: 'Santiago' },
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('saveTasks y loadTasks recuperan las mismas tareas', async () => {
  await saveTasks([task]);
  await expect(loadTasks()).resolves.toEqual([task]);
});

it('datos corruptos devuelven []', async () => {
  await saveTasks([task]);
  const [key] = await AsyncStorage.getAllKeys();

  await AsyncStorage.setItem(key, '{');
  await expect(loadTasks()).resolves.toEqual([]);

  await AsyncStorage.setItem(key, '{"no":"array"}');
  await expect(loadTasks()).resolves.toEqual([]);
});

it('una foto vieja en photoUri se lee como lista', async () => {
  const [key] = ['tasks'];
  await AsyncStorage.setItem(
    key,
    JSON.stringify([{ ...task, photoUris: undefined, photoUri: 'file://vieja.jpg' }]),
  );

  const loaded = await loadTasks();
  expect(loaded[0]?.photoUris).toEqual(['file://vieja.jpg']);
});

it('conserva remoteId y syncedAt', async () => {
  await saveTasks([{ ...task, remoteId: 4, syncedAt: '2026-11-06T01:00:00.000Z' }]);
  await expect(loadTasks()).resolves.toMatchObject([{ remoteId: 4, syncedAt: '2026-11-06T01:00:00.000Z' }]);
});

it('sin datos guardados devuelve []', async () => {
  await expect(loadTasks()).resolves.toEqual([]);
});

it('descarta ítems inválidos y conserva el resto', async () => {
  await saveTasks([task]);
  const [key] = await AsyncStorage.getAllKeys();
  await AsyncStorage.setItem(key, JSON.stringify([task, { id: 1 }, null]));

  await expect(loadTasks()).resolves.toEqual([task]);
});
