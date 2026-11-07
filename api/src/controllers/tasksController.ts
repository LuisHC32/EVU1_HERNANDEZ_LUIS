import { Request, Response } from 'express';
import {
  create as createTask,
  getById,
  list as listTasks,
  remove as removeTask,
  replace as replaceTask,
  update as updateTask,
  TaskFields,
  TaskLocation,
  TaskPatch,
} from '../repository/tasksRepository';

const TITULO_MAX = 120;

function isFail(value: object): value is { error: string } {
  return 'error' in value;
}

function parseId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

function readLocation(value: unknown): TaskLocation | { error: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: 'La ubicación no es válida' };
  }
  const loc = value as Record<string, unknown>;
  const { latitude, longitude } = loc;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return { error: 'latitude y longitude deben ser números' };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'latitude o longitude fuera de rango' };
  }
  if (loc.address !== undefined && loc.address !== null && typeof loc.address !== 'string') {
    return { error: 'address debe ser texto' };
  }
  const address =
    typeof loc.address === 'string' && loc.address.trim() !== '' ? loc.address.trim() : null;
  return { latitude, longitude, address };
}

function parseWrite(body: unknown): TaskFields | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'El cuerpo debe ser un objeto' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.titulo !== 'string' || b.titulo.trim() === '') {
    return { error: 'El título es obligatorio' };
  }
  const titulo = b.titulo.trim();
  if (titulo.length > TITULO_MAX) {
    return { error: 'El título no puede superar 120 caracteres' };
  }
  if (b.descripcion !== undefined && typeof b.descripcion !== 'string') {
    return { error: 'La descripción debe ser texto' };
  }
  if (b.completada !== undefined && typeof b.completada !== 'boolean') {
    return { error: 'completada debe ser verdadero o falso' };
  }
  let photoUri: string | null = null;
  if (b.photoUri !== undefined && b.photoUri !== null) {
    if (typeof b.photoUri !== 'string') return { error: 'photoUri debe ser texto' };
    photoUri = b.photoUri.trim() === '' ? null : b.photoUri.trim();
  }
  let location: TaskLocation | null = null;
  if (b.location !== undefined && b.location !== null) {
    const loc = readLocation(b.location);
    if (isFail(loc)) return loc;
    location = loc;
  }
  return {
    titulo,
    descripcion: typeof b.descripcion === 'string' ? b.descripcion : '',
    completada: b.completada === true,
    photoUri,
    location,
  };
}

function parsePatch(body: unknown): TaskPatch | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'El cuerpo debe ser un objeto' };
  }
  const b = body as Record<string, unknown>;
  const patch: TaskPatch = {};
  if ('titulo' in b) {
    if (typeof b.titulo !== 'string' || b.titulo.trim() === '') {
      return { error: 'El título es obligatorio' };
    }
    const titulo = b.titulo.trim();
    if (titulo.length > TITULO_MAX) {
      return { error: 'El título no puede superar 120 caracteres' };
    }
    patch.titulo = titulo;
  }
  if ('descripcion' in b) {
    if (typeof b.descripcion !== 'string') return { error: 'La descripción debe ser texto' };
    patch.descripcion = b.descripcion;
  }
  if ('completada' in b) {
    if (typeof b.completada !== 'boolean') return { error: 'completada debe ser verdadero o falso' };
    patch.completada = b.completada;
  }
  if ('photoUri' in b) {
    if (b.photoUri === null) patch.photoUri = null;
    else if (typeof b.photoUri !== 'string') return { error: 'photoUri debe ser texto' };
    else patch.photoUri = b.photoUri.trim() === '' ? null : b.photoUri.trim();
  }
  if ('location' in b) {
    if (b.location === null) patch.location = null;
    else {
      const loc = readLocation(b.location);
      if (isFail(loc)) return loc;
      patch.location = loc;
    }
  }
  if (Object.keys(patch).length === 0) {
    return { error: 'No hay campos para actualizar' };
  }
  return patch;
}

function idFrom(req: Request, res: Response): number | null {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseId(raw ?? '');
  if (id === null) {
    res.status(400).json({ error: 'Id inválido' });
    return null;
  }
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const raw = req.query.completada;
  if (raw !== undefined && raw !== 'true' && raw !== 'false') {
    res.status(400).json({ error: 'completada debe ser true o false' });
    return;
  }
  const tasks = await listTasks(raw === undefined ? undefined : raw === 'true');
  res.json(tasks);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = idFrom(req, res);
  if (id === null) return;
  const task = await getById(id);
  if (!task) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }
  res.json(task);
}

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = parseWrite(req.body);
  if (isFail(parsed)) {
    res.status(400).json(parsed);
    return;
  }
  res.status(201).json(await createTask(parsed));
}

export async function replace(req: Request, res: Response): Promise<void> {
  const id = idFrom(req, res);
  if (id === null) return;
  const parsed = parseWrite(req.body);
  if (isFail(parsed)) {
    res.status(400).json(parsed);
    return;
  }
  const task = await replaceTask(id, parsed);
  if (!task) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }
  res.json(task);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = idFrom(req, res);
  if (id === null) return;
  const parsed = parsePatch(req.body);
  if (isFail(parsed)) {
    res.status(400).json(parsed);
    return;
  }
  const task = await updateTask(id, parsed);
  if (!task) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }
  res.json(task);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = idFrom(req, res);
  if (id === null) return;
  const deleted = await removeTask(id);
  if (!deleted) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }
  res.status(204).end();
}
