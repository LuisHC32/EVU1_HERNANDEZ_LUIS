import { pool } from '../db/pool';
import { Task } from '../types/Task';

const COLUMNS =
  'id, titulo, descripcion, completada, photo_uri, latitude, longitude, address, created_at, updated_at';

type TaskRow = {
  id: number;
  titulo: string;
  descripcion: string;
  completada: boolean;
  photo_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type TaskLocation = {
  latitude: number;
  longitude: number;
  address: string | null;
};

export type TaskFields = {
  titulo: string;
  descripcion: string;
  completada: boolean;
  photoUri: string | null;
  location: TaskLocation | null;
};

export type TaskPatch = {
  titulo?: string;
  descripcion?: string;
  completada?: boolean;
  photoUri?: string | null;
  location?: TaskLocation | null;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toTask(row: TaskRow): Task {
  const task: Task = {
    id: Number(row.id),
    titulo: row.titulo,
    descripcion: row.descripcion,
    completada: row.completada,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
  if (row.photo_uri) task.photoUri = row.photo_uri;
  if (row.latitude !== null && row.longitude !== null) {
    task.location = {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    };
    if (row.address) task.location.address = row.address;
  }
  return task;
}

export async function list(completada?: boolean): Promise<Task[]> {
  const result = await pool.query<TaskRow>(
    `SELECT ${COLUMNS} FROM tasks
     WHERE ($1::boolean IS NULL OR completada = $1)
     ORDER BY id`,
    [completada ?? null],
  );
  return result.rows.map(toTask);
}

export async function getById(id: number): Promise<Task | null> {
  const result = await pool.query<TaskRow>(
    `SELECT ${COLUMNS} FROM tasks WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toTask(row) : null;
}

export async function create(fields: TaskFields): Promise<Task> {
  const result = await pool.query<TaskRow>(
    `INSERT INTO tasks (titulo, descripcion, completada, photo_uri, latitude, longitude, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      fields.titulo,
      fields.descripcion,
      fields.completada,
      fields.photoUri,
      fields.location?.latitude ?? null,
      fields.location?.longitude ?? null,
      fields.location?.address ?? null,
    ],
  );
  return toTask(result.rows[0]);
}

export async function replace(id: number, fields: TaskFields): Promise<Task | null> {
  const result = await pool.query<TaskRow>(
    `UPDATE tasks SET
       titulo = $2,
       descripcion = $3,
       completada = $4,
       photo_uri = $5,
       latitude = $6,
       longitude = $7,
       address = $8,
       updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [
      id,
      fields.titulo,
      fields.descripcion,
      fields.completada,
      fields.photoUri,
      fields.location?.latitude ?? null,
      fields.location?.longitude ?? null,
      fields.location?.address ?? null,
    ],
  );
  const row = result.rows[0];
  return row ? toTask(row) : null;
}

export async function update(id: number, patch: TaskPatch): Promise<Task | null> {
  const values: unknown[] = [];
  const sets: string[] = [];
  const set = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (patch.titulo !== undefined) set('titulo', patch.titulo);
  if (patch.descripcion !== undefined) set('descripcion', patch.descripcion);
  if (patch.completada !== undefined) set('completada', patch.completada);
  if (patch.photoUri !== undefined) set('photo_uri', patch.photoUri);
  if (patch.location !== undefined) {
    set('latitude', patch.location?.latitude ?? null);
    set('longitude', patch.location?.longitude ?? null);
    set('address', patch.location?.address ?? null);
  }
  sets.push('updated_at = now()');
  values.push(id);

  const result = await pool.query<TaskRow>(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
    values,
  );
  const row = result.rows[0];
  return row ? toTask(row) : null;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return result.rowCount === 1;
}
