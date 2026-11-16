import { beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createTask, deleteTask } from '../src/services/api';
import { isOnline } from '../src/services/network';
import { enqueue, loadQueue, taskPayload } from '../src/services/queue';
import { loadTasks, saveTasks } from '../src/services/storage';
import { processQueue } from '../src/services/sync';
import type { Task } from '../src/types/Task';

jest.mock('../src/services/api', () => ({
  apiBase: jest.fn(() => 'http://10.0.0.2:3000'),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

jest.mock('../src/services/network', () => ({
  isOnline: jest.fn(() => true),
}));

const task: Task = {
  id: 'a',
  titulo: 'Comprar',
  descripcion: 'leche',
  completada: false,
  createdAt: '2026-11-06T00:00:00.000Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.mocked(isOnline).mockReturnValue(true);
});

it('al volver la red el alta recibe remoteId y sale de la cola', async () => {
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });
  jest.mocked(createTask).mockResolvedValue({ kind: 'ok', remoteId: 9 });

  await expect(processQueue()).resolves.toMatchObject({ synced: 1 });

  await expect(loadTasks()).resolves.toMatchObject([{ id: 'a', remoteId: 9 }]);
  await expect(loadQueue()).resolves.toEqual([]);
  expect(createTask).toHaveBeenCalledTimes(1);
});

it('sin red no llama a la API y la operación sigue encolada', async () => {
  jest.mocked(isOnline).mockReturnValue(false);
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });

  await processQueue();

  expect(createTask).not.toHaveBeenCalled();
  await expect(loadQueue()).resolves.toHaveLength(1);
});

it('un 500 deja la operación para reintentar', async () => {
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });
  jest.mocked(createTask).mockResolvedValue({ kind: 'stop' });

  await processQueue();

  await expect(loadQueue()).resolves.toHaveLength(1);
  expect((await loadTasks())[0]?.remoteId).toBeUndefined();
});

it('un 400 descarta la operación y no borra la tarea local', async () => {
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });
  jest.mocked(createTask).mockResolvedValue({ kind: 'drop', status: 400 });

  await processQueue();

  await expect(loadQueue()).resolves.toEqual([]);
  await expect(loadTasks()).resolves.toHaveLength(1);
});

it('borrar una tarea sincronizada llama DELETE y vacía la cola', async () => {
  await saveTasks([{ ...task, remoteId: 4 }]);
  await enqueue({ type: 'delete', taskId: task.id, remoteId: 4 });
  jest.mocked(deleteTask).mockResolvedValue({ kind: 'ok' });

  await processQueue();

  expect(deleteTask).toHaveBeenCalledWith(4);
  await expect(loadQueue()).resolves.toEqual([]);
});
