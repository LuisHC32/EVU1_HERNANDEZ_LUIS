import request from 'supertest';
import { Client } from 'pg';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import { migrate } from '../src/db/migrate';

async function ensureTestDatabase(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL as string);
  const dbName = url.pathname.replace(/^\//, '');
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error('Nombre de base de prueba inválido');
  }
  const admin = new URL(url.toString());
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await ensureTestDatabase();
  await migrate();
});

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
});

afterAll(async () => {
  await pool.end();
});

test('GET /tasks devuelve 200 y un arreglo', async () => {
  const res = await request(app).get('/tasks');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /tasks devuelve 201 y asigna id, createdAt y updatedAt', async () => {
  const res = await request(app)
    .post('/tasks')
    .send({ titulo: 'Comprar pan', descripcion: 'Integral' });

  expect(res.status).toBe(201);
  expect(typeof res.body.id).toBe('number');
  expect(res.body.titulo).toBe('Comprar pan');
  expect(res.body.descripcion).toBe('Integral');
  expect(res.body.completada).toBe(false);
  expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
  expect(Number.isNaN(Date.parse(res.body.updatedAt))).toBe(false);
  expect(res.body).not.toHaveProperty('photoUri');
  expect(res.body).not.toHaveProperty('location');
});

test('POST /tasks sin titulo devuelve 400 con error', async () => {
  const res = await request(app).post('/tasks').send({ descripcion: 'sin titulo' });
  expect(res.status).toBe(400);
  expect(typeof res.body.error).toBe('string');
  expect(res.body.error.toLowerCase()).toContain('título');
});

test('GET /tasks/:id devuelve la tarea o 404', async () => {
  const created = await request(app).post('/tasks').send({ titulo: 'Una' });
  const ok = await request(app).get(`/tasks/${created.body.id}`);
  expect(ok.status).toBe(200);
  expect(ok.body.id).toBe(created.body.id);
  expect(ok.body.titulo).toBe('Una');

  const missing = await request(app).get('/tasks/999999');
  expect(missing.status).toBe(404);
  expect(missing.body.error.toLowerCase()).toContain('no encontr');
});

test('PUT y PATCH cambian los campos y updatedAt', async () => {
  const created = await request(app).post('/tasks').send({ titulo: 'Antes' });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const put = await request(app).put(`/tasks/${created.body.id}`).send({
    titulo: 'Despues',
    descripcion: 'nota',
    completada: true,
  });
  expect(put.status).toBe(200);
  expect(put.body.titulo).toBe('Despues');
  expect(put.body.descripcion).toBe('nota');
  expect(put.body.completada).toBe(true);
  expect(put.body.updatedAt).not.toBe(created.body.updatedAt);

  await new Promise((resolve) => setTimeout(resolve, 20));
  const patch = await request(app)
    .patch(`/tasks/${created.body.id}`)
    .send({ completada: false });
  expect(patch.status).toBe(200);
  expect(patch.body.completada).toBe(false);
  expect(patch.body.titulo).toBe('Despues');
  expect(patch.body.updatedAt).not.toBe(put.body.updatedAt);
});

test('DELETE /tasks/:id devuelve 204 y la tarea ya no aparece', async () => {
  const created = await request(app).post('/tasks').send({ titulo: 'Borrar' });
  const del = await request(app).delete(`/tasks/${created.body.id}`);
  expect(del.status).toBe(204);

  const gone = await request(app).get(`/tasks/${created.body.id}`);
  expect(gone.status).toBe(404);
  const list = await request(app).get('/tasks');
  expect(list.body).toEqual([]);
});

test('GET /tasks?completada=true devuelve solo las completadas', async () => {
  await request(app).post('/tasks').send({ titulo: 'Abierta' });
  await request(app).post('/tasks').send({ titulo: 'Cerrada', completada: true });

  const res = await request(app).get('/tasks').query({ completada: 'true' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].titulo).toBe('Cerrada');
  expect(res.body[0].completada).toBe(true);
});

test('POST guarda photoUri y location y los devuelve juntos', async () => {
  const res = await request(app).post('/tasks').send({
    titulo: 'Foto',
    photoUri: 'file:///foto.jpg',
    location: { latitude: -33.5, longitude: -70.5, address: 'Santiago' },
  });

  expect(res.status).toBe(201);
  expect(res.body.photoUri).toBe('file:///foto.jpg');
  expect(res.body.location).toEqual({
    latitude: -33.5,
    longitude: -70.5,
    address: 'Santiago',
  });
});
