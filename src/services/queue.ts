import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingOp, Task, TaskLocation, TaskPayload } from '../types/Task';

const QUEUE_KEY = 'task-ops';

let tail: Promise<unknown> = Promise.resolve();

export function withStorage<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export type OpInput = {
  type: PendingOp['type'];
  taskId: string;
  payload?: TaskPayload;
  remoteId?: number;
};

// ponytail: la API guarda un solo photo_uri; se envía la primera. Columna photo_uris si hay que persistir el resto.
export function taskPayload(task: Pick<Task, 'titulo' | 'descripcion' | 'completada' | 'photoUris' | 'location'>): TaskPayload {
  return {
    titulo: task.titulo,
    descripcion: task.descripcion,
    completada: task.completada,
    photoUri: task.photoUris?.[0] ?? null,
    location: task.location ?? null,
  };
}

export function payloadEquals(a: TaskPayload, b: TaskPayload): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

function canon(payload: TaskPayload) {
  return {
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    completada: payload.completada,
    photoUri: payload.photoUri ?? null,
    location: payload.location
      ? {
          latitude: payload.location.latitude,
          longitude: payload.location.longitude,
          address: payload.location.address ?? null,
        }
      : null,
  };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function compact(queue: PendingOp[], incoming: OpInput): PendingOp[] {
  if (incoming.type === 'update' && !incoming.remoteId) {
    const known = queue.find((op) => op.taskId === incoming.taskId && op.remoteId);
    incoming = known?.remoteId
      ? { ...incoming, remoteId: known.remoteId }
      : { ...incoming, type: 'create' };
  }
  if (incoming.type !== 'delete' && queue.some((op) => op.type === 'delete' && op.taskId === incoming.taskId)) {
    return queue;
  }

  if (incoming.type === 'delete') {
    const pendingCreate = queue.some((op) => op.type === 'create' && op.taskId === incoming.taskId);
    if (pendingCreate || !incoming.remoteId) {
      return queue.filter((op) => op.taskId !== incoming.taskId);
    }
    return [
      ...queue.filter((op) => op.taskId !== incoming.taskId),
      {
        opId: newId(),
        type: 'delete',
        taskId: incoming.taskId,
        remoteId: incoming.remoteId,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    ];
  }

  const createIdx = queue.findIndex((op) => op.type === 'create' && op.taskId === incoming.taskId);
  if (createIdx >= 0) {
    const next = queue.slice();
    next[createIdx] = { ...next[createIdx], payload: incoming.payload };
    return next;
  }

  if (incoming.type === 'update') {
    const updateIdx = queue.findIndex((op) => op.type === 'update' && op.taskId === incoming.taskId);
    if (updateIdx >= 0) {
      const next = queue.slice();
      next[updateIdx] = {
        ...next[updateIdx],
        payload: incoming.payload,
        remoteId: incoming.remoteId ?? next[updateIdx].remoteId,
      };
      return next.filter((op, index) => op.taskId !== incoming.taskId || op.type !== 'update' || index === updateIdx);
    }
  }

  const op: PendingOp = {
    opId: newId(),
    type: incoming.type,
    taskId: incoming.taskId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  if (incoming.payload) op.payload = incoming.payload;
  if (incoming.remoteId) op.remoteId = incoming.remoteId;
  return [...queue, op];
}

export async function loadQueue(): Promise<PendingOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return parseQueue(raw);
  } catch {
    return [];
  }
}

export async function saveQueue(queue: PendingOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(input: OpInput): Promise<PendingOp[]> {
  const next = compact(await loadQueue(), input);
  await saveQueue(next);
  return next;
}

export async function cancelDelete(taskId: string): Promise<boolean> {
  const queue = await loadQueue();
  const next = queue.filter((op) => !(op.type === 'delete' && op.taskId === taskId));
  if (next.length === queue.length) return false;
  await saveQueue(next);
  return true;
}

export async function backfill(tasks: Task[]): Promise<void> {
  let queue = await loadQueue();
  let changed = false;
  for (const task of tasks) {
    if (task.remoteId) continue;
    if (queue.some((op) => op.taskId === task.id)) continue;
    queue = compact(queue, { type: 'create', taskId: task.id, payload: taskPayload(task) });
    changed = true;
  }
  if (changed) await saveQueue(queue);
}

function parseQueue(raw: string): PendingOp[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const op = toOp(item);
      return op ? [op] : [];
    });
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toLocation(value: unknown): TaskLocation | null | undefined {
  if (value === undefined || value === null) return value;
  if (!isRecord(value)) return undefined;
  const { latitude, longitude, address } = value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (address !== undefined && address !== null && typeof address !== 'string') return undefined;
  const trimmed = typeof address === 'string' ? address.trim() : '';
  return trimmed ? { latitude, longitude, address: trimmed } : { latitude, longitude };
}

function toPayload(value: unknown): TaskPayload | null {
  if (!isRecord(value)) return null;
  if (typeof value.titulo !== 'string' || typeof value.descripcion !== 'string') return null;
  if (typeof value.completada !== 'boolean') return null;
  if (value.photoUri !== undefined && value.photoUri !== null && typeof value.photoUri !== 'string') return null;
  const location = toLocation(value.location);
  if (value.location !== undefined && value.location !== null && location === undefined) return null;
  return {
    titulo: value.titulo,
    descripcion: value.descripcion,
    completada: value.completada,
    photoUri: typeof value.photoUri === 'string' ? value.photoUri : null,
    location: location ?? null,
  };
}

function toOp(value: unknown): PendingOp | null {
  if (!isRecord(value)) return null;
  if (value.type !== 'create' && value.type !== 'update' && value.type !== 'delete') return null;
  if (typeof value.opId !== 'string' || value.opId.length === 0) return null;
  if (typeof value.taskId !== 'string' || value.taskId.length === 0) return null;
  if (typeof value.createdAt !== 'string') return null;
  const payload = value.payload === undefined ? undefined : toPayload(value.payload);
  if (value.payload !== undefined && !payload) return null;
  const op: PendingOp = {
    opId: value.opId,
    type: value.type,
    taskId: value.taskId,
    createdAt: value.createdAt,
    attempts: typeof value.attempts === 'number' ? value.attempts : 0,
  };
  if (payload) op.payload = payload;
  if (typeof value.remoteId === 'number' && Number.isInteger(value.remoteId) && value.remoteId > 0) {
    op.remoteId = value.remoteId;
  }
  return op;
}
