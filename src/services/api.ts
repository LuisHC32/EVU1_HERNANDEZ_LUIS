import type { TaskPayload } from '../types/Task';

const TIMEOUT_MS = 8000;

export type ApiResult =
  | { kind: 'ok'; remoteId?: number }
  | { kind: 'drop'; status: number }
  | { kind: 'stop' };

export function apiBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  return (typeof raw === 'string' ? raw : '').replace(/\/$/, '');
}

export function createTask(payload: TaskPayload): Promise<ApiResult> {
  return request('POST', '/tasks', payload, true);
}

export function updateTask(id: number, payload: TaskPayload): Promise<ApiResult> {
  return request('PUT', `/tasks/${id}`, payload, false);
}

export function deleteTask(id: number): Promise<ApiResult> {
  return request('DELETE', `/tasks/${id}`, undefined, false);
}

async function request(method: string, path: string, body: TaskPayload | undefined, needId: boolean): Promise<ApiResult> {
  const base = apiBase();
  if (!base) return { kind: 'stop' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (response.status >= 500) return { kind: 'stop' };
    if (response.status >= 400) return { kind: 'drop', status: response.status };
    if (!needId) return { kind: 'ok' };
    const parsed: unknown = await response.json().catch(() => null);
    const remoteId = readId(parsed);
    if (!remoteId) {
      // ponytail: 2xx sin id se descarta; reintentar el POST duplicaría la fila
      console.error('sync: POST /tasks respondió sin id');
      return { kind: 'drop', status: response.status };
    }
    return { kind: 'ok', remoteId };
  } catch {
    return { kind: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

function readId(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || !('id' in value)) return undefined;
  const id = value.id;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined;
}
