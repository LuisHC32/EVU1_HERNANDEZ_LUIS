import { apiBase, createTask, deleteTask, listTaskIds, updateTask, type ApiResult } from './api';
import { isOnline } from './network';
import { enqueue, loadQueue, payloadEquals, saveQueue, taskPayload, withStorage, type OpInput } from './queue';
import { loadTasks, saveTasks } from './storage';
import type { PendingOp, TaskPayload } from '../types/Task';

export type SyncPatch = {
  taskId: string;
  remoteId?: number;
  deleted?: boolean;
};

export type SyncResult = {
  synced: number;
  patches: SyncPatch[];
};

export type SyncTaskStatus = 'synced' | 'offline' | 'error' | 'dropped' | 'missing';

let gate: Promise<unknown> = Promise.resolve();

function enqueueRun<T>(fn: () => Promise<T>): Promise<T> {
  const run = gate.then(fn, fn);
  gate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function processQueue(): Promise<SyncResult> {
  return enqueueRun(drainAll);
}

/** Sincroniza una tarea específica con la API y actualiza su estado en almacenamiento. */
export function syncTask(taskId: string): Promise<SyncTaskStatus> {
  return enqueueRun(() => syncOne(taskId));
}

/** Verifica contra GET /tasks qué tareas existen realmente en la API. */
export function verifyWithApi(): Promise<boolean> {
  return enqueueRun(verifyRemote);
}

async function runOp(op: PendingOp): Promise<{ kind: 'ok' | 'stop' | 'drop'; synced: number; patches: SyncPatch[] }> {
  const result = await dispatch(op);
  if (result.kind === 'stop') {
    await withStorage(async () => {
      const queue = await loadQueue();
      await saveQueue(queue.map((item) => (item.opId === op.opId ? { ...item, attempts: item.attempts + 1 } : item)));
    });
    return { kind: 'stop', synced: 0, patches: [] };
  }
  const committed = await withStorage(() => commit(op, result));
  if (committed.compensateId) {
    const removed = await deleteTask(committed.compensateId);
    if (removed.kind !== 'ok') console.error('sync: no se pudo borrar el alta huérfana', committed.compensateId);
  }
  return {
    kind: result.kind === 'drop' ? 'drop' : 'ok',
    synced: committed.synced,
    patches: committed.patches,
  };
}

async function drainAll(): Promise<SyncResult> {
  const patches: SyncPatch[] = [];
  let synced = 0;
  if (!isOnline() || !apiBase()) return { synced, patches };
  for (;;) {
    if (!isOnline() || !apiBase()) return { synced, patches };
    const op = await withStorage(async () => (await loadQueue())[0] ?? null);
    if (!op) return { synced, patches };
    const step = await runOp(op);
    if (step.kind === 'stop') return { synced, patches };
    synced += step.synced;
    patches.push(...step.patches);
  }
}

async function nextOpForTask(taskId: string, allowCreate: boolean): Promise<PendingOp | null> {
  return withStorage(async () => {
    const existing = (await loadQueue()).find((item) => item.taskId === taskId);
    if (existing) return existing;
    if (!allowCreate) return null;
    const task = (await loadTasks()).find((item) => item.id === taskId);
    if (!task) return null;
    const input: OpInput = task.remoteId
      ? { type: 'update', taskId: task.id, remoteId: task.remoteId, payload: taskPayload(task) }
      : { type: 'create', taskId: task.id, payload: taskPayload(task) };
    const next = await enqueue(input);
    return next.find((item) => item.taskId === taskId) ?? null;
  });
}

async function syncOne(taskId: string): Promise<SyncTaskStatus> {
  if (!apiBase()) return 'error';
  if (!isOnline()) return 'offline';
  let ran = false;
  let totalSynced = 0;
  for (;;) {
    if (!isOnline()) return 'offline';
    const op = await nextOpForTask(taskId, !ran);
    if (!op) return ran ? (totalSynced > 0 ? 'synced' : 'missing') : 'missing';
    ran = true;
    const step = await runOp(op);
    if (step.kind === 'stop') return 'error';
    if (step.kind === 'drop') return 'dropped';
    totalSynced += step.synced;
  }
}

async function verifyRemote(): Promise<boolean> {
  if (!isOnline() || !apiBase()) return false;
  const listed = await listTaskIds();
  if (listed.kind !== 'ok') return false;
  const remoteIds = new Set(listed.ids);
  const now = new Date().toISOString();

  await withStorage(async () => {
    const tasks = await loadTasks();
    const queue = await loadQueue();
    const pendingIds = new Set(queue.map((op) => op.taskId));
    let tasksChanged = false;
    const missingTaskIds = new Set<string>();

    const nextTasks = tasks.map((task) => {
      if (task.remoteId && !remoteIds.has(task.remoteId)) {
        tasksChanged = true;
        missingTaskIds.add(task.id);
        const { remoteId: _r, syncedAt: _s, ...rest } = task;
        return rest;
      }
      if (!task.remoteId && task.syncedAt) {
        tasksChanged = true;
        const { syncedAt: _s, ...rest } = task;
        return rest;
      }
      if (task.remoteId && remoteIds.has(task.remoteId) && !task.syncedAt && !pendingIds.has(task.id)) {
        tasksChanged = true;
        return { ...task, syncedAt: now };
      }
      return task;
    });

    let queueChanged = false;
    const nextQueue = queue.flatMap((op) => {
      if (op.type === 'delete' && op.remoteId && !remoteIds.has(op.remoteId)) {
        queueChanged = true;
        return [];
      }
      if (op.type === 'update' && (missingTaskIds.has(op.taskId) || (op.remoteId && !remoteIds.has(op.remoteId)))) {
        queueChanged = true;
        const { remoteId: _r, ...rest } = op;
        return [{ ...rest, type: 'create' as const }];
      }
      return [op];
    });

    if (tasksChanged) await saveTasks(nextTasks);
    if (queueChanged) await saveQueue(nextQueue);
  });

  return true;
}

async function dispatch(op: PendingOp): Promise<ApiResult> {
  const known = op.remoteId ?? (await loadTasks()).find((task) => task.id === op.taskId)?.remoteId;
  if (op.type === 'create' && !known) {
    if (!op.payload) return { kind: 'drop', status: 0 };
    return createTask(op.payload);
  }
  if (!known) return { kind: 'drop', status: 0 };
  if (op.type === 'delete') {
    const result = await deleteTask(known);
    return result.kind === 'ok' ? { kind: 'ok', remoteId: known } : result;
  }
  if (!op.payload) return { kind: 'drop', status: 0 };
  const result = await updateTask(known, op.payload);
  if (result.kind === 'drop' && result.status === 404) {
    // Si la tarea ya no existe en la API, limpiamos el remoteId obsoleto y la creamos de nuevo.
    await withStorage(async () => {
      const tasks = await loadTasks();
      await saveTasks(
        tasks.map((task) => {
          if (task.id !== op.taskId) return task;
          const { remoteId: _r, syncedAt: _s, ...rest } = task;
          return rest;
        }),
      );
      const queue = await loadQueue();
      await saveQueue(
        queue.map((item) => {
          if (item.opId !== op.opId) return item;
          const { remoteId: _r, ...rest } = item;
          return { ...rest, type: 'create' as const };
        }),
      );
    });
    return createTask(op.payload);
  }
  return result.kind === 'ok' ? { kind: 'ok', remoteId: known } : result;
}

async function commit(op: PendingOp, result: ApiResult): Promise<{ synced: number; patches: SyncPatch[]; compensateId?: number }> {
  const queue = await loadQueue();
  const current = queue.find((item) => item.opId === op.opId);
  if (result.kind === 'drop') {
    console.error('sync: operación descartada', op.type, op.taskId, result.status);
    await saveQueue(queue.filter((item) => item.opId !== op.opId));
    return { synced: 0, patches: [] };
  }
  if (result.kind !== 'ok') return { synced: 0, patches: [] };
  if (!current) {
    if (op.type === 'create' && result.remoteId) return { synced: 0, patches: [], compensateId: result.remoteId };
    if (op.type === 'delete') return { synced: 1, patches: [{ taskId: op.taskId, deleted: true }] };
    return { synced: 0, patches: [] };
  }
  const remoteId = result.remoteId ?? current.remoteId;
  const changed = op.payload && current.payload && !payloadEquals(op.payload, current.payload);
  if (changed && remoteId && current.payload) {
    await saveQueue(queue.map((item) => (item.opId === op.opId ? { ...item, type: 'update' as const, remoteId, payload: current.payload } : item)));
    await stamp(op.taskId, remoteId, current.payload);
    return { synced: 1, patches: [{ taskId: op.taskId, remoteId }] };
  }
  await saveQueue(queue.filter((item) => item.opId !== op.opId));
  if (op.type === 'delete') return { synced: 1, patches: [{ taskId: op.taskId, deleted: true }] };
  if (remoteId) {
    await stamp(op.taskId, remoteId, op.payload);
    return { synced: 1, patches: [{ taskId: op.taskId, remoteId }] };
  }
  return { synced: 1, patches: [] };
}

async function stamp(taskId: string, remoteId: number, payload?: TaskPayload): Promise<void> {
  const now = new Date().toISOString();
  const tasks = await loadTasks();
  await saveTasks(
    tasks.map((task) => {
      if (task.id !== taskId) return task;
      const same = payload ? payloadEquals(taskPayload(task), payload) : false;
      if (same) return { ...task, remoteId, syncedAt: now };
      const { syncedAt: _drop, ...rest } = task;
      return { ...rest, remoteId };
    }),
  );
}

export type { OpInput };
