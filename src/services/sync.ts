import { apiBase, createTask, deleteTask, updateTask, type ApiResult } from './api';
import { isOnline } from './network';
import { loadQueue, payloadEquals, saveQueue, taskPayload, withStorage, type OpInput } from './queue';
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

let gate: Promise<unknown> = Promise.resolve();

export function processQueue(): Promise<SyncResult> {
  const run = gate.then(drainAll, drainAll);
  gate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function drainAll(): Promise<SyncResult> {
  const patches: SyncPatch[] = [];
  let synced = 0;
  if (!isOnline() || !apiBase()) return { synced, patches };
  for (;;) {
    if (!isOnline() || !apiBase()) return { synced, patches };
    const op = await withStorage(async () => (await loadQueue())[0] ?? null);
    if (!op) return { synced, patches };
    const result = await dispatch(op);
    if (result.kind === 'stop') {
      await withStorage(async () => {
        const queue = await loadQueue();
        await saveQueue(queue.map((item) => (item.opId === op.opId ? { ...item, attempts: item.attempts + 1 } : item)));
      });
      return { synced, patches };
    }
    const committed = await withStorage(() => commit(op, result));
    synced += committed.synced;
    patches.push(...committed.patches);
    if (committed.compensateId) {
      const removed = await deleteTask(committed.compensateId);
      if (removed.kind !== 'ok') console.error('sync: no se pudo borrar el alta huérfana', committed.compensateId);
    }
  }
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
