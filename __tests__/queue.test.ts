import { expect, it } from '@jest/globals';

import { compact } from '../src/services/queue';
import type { PendingOp, TaskPayload } from '../src/types/Task';

function payload(titulo: string): TaskPayload {
  return { titulo, descripcion: '', completada: false, photoUri: null, location: null };
}

function op(type: PendingOp['type'], taskId: string, extra: Partial<PendingOp> = {}): PendingOp {
  return {
    opId: extra.opId ?? `${type}-${taskId}`,
    type,
    taskId,
    createdAt: '2026-01-01T00:00:00.000Z',
    attempts: 0,
    ...extra,
  };
}

it('varios cambios de una tarea nueva quedan en un solo alta', () => {
  const created = op('create', 'a', { payload: payload('uno') });
  const queue = compact([created], { type: 'update', taskId: 'a', payload: payload('dos') });

  expect(queue).toHaveLength(1);
  expect(queue[0].type).toBe('create');
  expect(queue[0].payload?.titulo).toBe('dos');
});

it('borrar una tarea que nunca se envió no deja operaciones', () => {
  const created = op('create', 'a', { payload: payload('uno') });
  expect(compact([created], { type: 'delete', taskId: 'a' })).toEqual([]);
});

it('editar y borrar una tarea ya sincronizada deja solo el borrado', () => {
  const updated = op('update', 'a', { remoteId: 3, payload: payload('uno') });
  const queue = compact([updated], { type: 'delete', taskId: 'a', remoteId: 3 });

  expect(queue).toHaveLength(1);
  expect(queue[0].type).toBe('delete');
  expect(queue[0].remoteId).toBe(3);
});

it('una edición sin remoteId hereda el de la cola', () => {
  const first = op('update', 'a', { remoteId: 3, payload: payload('uno') });
  const queue = compact([first], { type: 'update', taskId: 'a', payload: payload('dos') });

  expect(queue).toHaveLength(1);
  expect(queue[0].type).toBe('update');
  expect(queue[0].remoteId).toBe(3);
  expect(queue[0].payload?.titulo).toBe('dos');
});

it('dos ediciones de la misma tarea remota se fusionan', () => {
  const first = op('update', 'a', { remoteId: 3, payload: payload('uno') });
  const queue = compact([first], { type: 'update', taskId: 'a', remoteId: 3, payload: payload('dos') });

  expect(queue).toHaveLength(1);
  expect(queue[0].payload?.titulo).toBe('dos');
  expect(queue[0].remoteId).toBe(3);
});
