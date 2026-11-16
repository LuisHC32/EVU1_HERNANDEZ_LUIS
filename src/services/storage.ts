import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Task, TaskLocation } from '../types/Task';

const STORAGE_KEY = 'tasks';

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return parseTasks(raw);
  } catch {
    return [];
  }
}

function parseTasks(raw: string): Task[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((item) => {
      const task = toTask(item);
      return task ? [task] : [];
    });
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toLocation(value: unknown): TaskLocation | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return null;
  }
  const { latitude, longitude, address } = value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (address !== undefined && typeof address !== 'string') {
    return null;
  }
  const trimmed = typeof address === 'string' ? address.trim() : '';
  return trimmed ? { latitude, longitude, address: trimmed } : { latitude, longitude };
}

function toPhotoUris(value: Record<string, unknown>): string[] | null {
  if (value.photoUris !== undefined) {
    if (!Array.isArray(value.photoUris)) {
      return null;
    }
    const uris: string[] = [];
    for (const item of value.photoUris) {
      if (typeof item !== 'string') {
        return null;
      }
      if (item.length > 0) {
        uris.push(item);
      }
    }
    return uris;
  }
  if (value.photoUri === undefined) {
    return [];
  }
  if (typeof value.photoUri !== 'string') {
    return null;
  }
  return value.photoUri.length > 0 ? [value.photoUri] : [];
}

function toTask(value: unknown): Task | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    return null;
  }
  if (typeof value.titulo !== 'string' || typeof value.descripcion !== 'string') {
    return null;
  }
  if (typeof value.completada !== 'boolean') {
    return null;
  }
  if (value.createdAt !== undefined && typeof value.createdAt !== 'string') {
    return null;
  }

  const photos = toPhotoUris(value);
  if (photos === null) {
    return null;
  }

  const location = toLocation(value.location);
  if (location === null) {
    return null;
  }

  const task: Task = {
    id: value.id,
    titulo: value.titulo,
    descripcion: value.descripcion,
    completada: value.completada,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
  };
  if (photos.length > 0) {
    task.photoUris = photos;
  }
  if (location) {
    task.location = location;
  }
  if (typeof value.remoteId === 'number' && Number.isInteger(value.remoteId) && value.remoteId > 0) {
    task.remoteId = value.remoteId;
  }
  if (typeof value.updatedAt === 'string' && value.updatedAt.length > 0) {
    task.updatedAt = value.updatedAt;
  }
  if (typeof value.syncedAt === 'string' && value.syncedAt.length > 0) {
    task.syncedAt = value.syncedAt;
  }
  return task;
}
