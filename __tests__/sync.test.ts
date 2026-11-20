import { beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createTask, deleteTask, listTaskIds, updateTask } from '../src/services/api';
import { isOnline } from '../src/services/network';
import { enqueue, loadQueue, taskPayload } from '../src/services/queue';
import { loadTasks, saveTasks } from '../src/services/storage';
import { processQueue, syncTask, verifyWithApi } from '../src/services/sync';
import type { Task } from '../src/types/Task';

jest.mock('../src/services/api', () => ({
  apiBase: jest.fn(() => 'http://10.0.0.2:3000'),
  listTaskIds: jest.fn(),
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

it('syncTask sincroniza solo la tarea elegida y deja el resto en cola', async () => {
  const second: Task = { ...task, id: 'b', titulo: 'Pagar luz' };
  await saveTasks([task, second]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });
  await enqueue({ type: 'create', taskId: second.id, payload: taskPayload(second) });
  jest.mocked(createTask).mockResolvedValue({ kind: 'ok', remoteId: 12 });

  await expect(syncTask('b')).resolves.toBe('synced');

  expect(createTask).toHaveBeenCalledTimes(1);
  expect(createTask).toHaveBeenCalledWith(taskPayload(second));
  const saved = await loadTasks();
  expect(saved.find((item) => item.id === 'a')?.remoteId).toBeUndefined();
  expect(saved.find((item) => item.id === 'b')?.remoteId).toBe(12);
  expect(saved.find((item) => item.id === 'b')?.syncedAt).toBeTruthy();
  const remaining = await loadQueue();
  expect(remaining).toHaveLength(1);
  expect(remaining[0]?.taskId).toBe('a');
});

it('syncTask actualiza una tarea con remoteId aunque no esté en cola', async () => {
  await saveTasks([{ ...task, remoteId: 7 }]);
  jest.mocked(updateTask).mockResolvedValue({ kind: 'ok' });

  await expect(syncTask('a')).resolves.toBe('synced');

  expect(updateTask).toHaveBeenCalledWith(7, taskPayload(task));
  expect((await loadTasks())[0]?.syncedAt).toBeTruthy();
  await expect(loadQueue()).resolves.toEqual([]);
});

it('syncTask crea una tarea sin remoteId aunque no esté en cola', async () => {
  await saveTasks([task]);
  jest.mocked(createTask).mockResolvedValue({ kind: 'ok', remoteId: 15 });

  await expect(syncTask('a')).resolves.toBe('synced');

  expect(createTask).toHaveBeenCalledWith(taskPayload(task));
  await expect(loadTasks()).resolves.toMatchObject([{ id: 'a', remoteId: 15 }]);
});

it('syncTask sin conexión devuelve offline y no llama a la API', async () => {
  jest.mocked(isOnline).mockReturnValue(false);
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });

  await expect(syncTask('a')).resolves.toBe('offline');

  expect(createTask).not.toHaveBeenCalled();
  await expect(loadQueue()).resolves.toHaveLength(1);
});

it('syncTask ante error 5xx devuelve error y conserva la operación', async () => {
  await saveTasks([task]);
  await enqueue({ type: 'create', taskId: task.id, payload: taskPayload(task) });
  jest.mocked(createTask).mockResolvedValue({ kind: 'stop' });

  await expect(syncTask('a')).resolves.toBe('error');

  await expect(loadQueue()).resolves.toHaveLength(1);
});

it('syncTask devuelve missing si la tarea no existe', async () => {
  await expect(syncTask('inexistente')).resolves.toBe('missing');
});

it('syncTask recrea la tarea con POST si PUT responde 404', async () => {
  await saveTasks([{ ...task, remoteId: 7, syncedAt: '2026-11-06T01:00:00.000Z' }]);
  jest.mocked(updateTask).mockResolvedValue({ kind: 'drop', status: 404 });
  jest.mocked(createTask).mockResolvedValue({ kind: 'ok', remoteId: 33 });

  await expect(syncTask('a')).resolves.toBe('synced');

  expect(updateTask).toHaveBeenCalledWith(7, taskPayload(task));
  expect(createTask).toHaveBeenCalledWith(taskPayload(task));
  const saved = await loadTasks();
  expect(saved[0]?.remoteId).toBe(33);
  expect(saved[0]?.syncedAt).toBeTruthy();
  await expect(loadQueue()).resolves.toEqual([]);
});

it('verifyWithApi quita remoteId y syncedAt si la tarea ya no existe en GET /tasks', async () => {
  const present: Task = { ...task, id: 'b', titulo: 'Presente', remoteId: 2 };
  await saveTasks([
    { ...task, id: 'a', remoteId: 1, syncedAt: '2026-11-06T01:00:00.000Z' },
    present,
  ]);
  await enqueue({ type: 'update', taskId: 'a', remoteId: 1, payload: taskPayload(task) });
  jest.mocked(listTaskIds).mockResolvedValue({ kind: 'ok', ids: [2] });

  await expect(verifyWithApi()).resolves.toBe(true);

  const saved = await loadTasks();
  expect(saved.find((item) => item.id === 'a')?.remoteId).toBeUndefined();
  expect(saved.find((item) => item.id === 'a')?.syncedAt).toBeUndefined();
  expect(saved.find((item) => item.id === 'b')?.remoteId).toBe(2);
  expect(saved.find((item) => item.id === 'b')?.syncedAt).toBeTruthy();

  const queue = await loadQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0]?.type).toBe('create');
  expect(queue[0]?.remoteId).toBeUndefined();
});

it('verifyWithApi conserva el estado local si la API no responde', async () => {
  await saveTasks([{ ...task, remoteId: 1, syncedAt: '2026-11-06T01:00:00.000Z' }]);
  jest.mocked(listTaskIds).mockResolvedValue({ kind: 'error' });

  await expect(verifyWithApi()).resolves.toBe(false);

  await expect(loadTasks()).resolves.toMatchObject([{ id: 'a', remoteId: 1, syncedAt: '2026-11-06T01:00:00.000Z' }]);
});
