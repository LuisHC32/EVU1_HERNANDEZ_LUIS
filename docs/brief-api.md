# Brief: API de tareas

## 1. Objetivo

Construir una API REST propia que guarde y entregue las tareas de la app To-Do List. Esta API solo expone los datos; la app se conecta a ella en otra etapa.

## 2. Stack

| Necesidad | Herramienta |
|-----------|-------------|
| Servidor | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL 16 |
| Driver | `pg` (node-postgres) con un `Pool` de conexiones |
| Variables de entorno | `dotenv`, con un `.env.example` en el repo |
| Validación | Validación manual en el controlador (o `zod`) |
| CORS | `cors`, para aceptar peticiones desde la app y desde Expo Web |
| Desarrollo | `tsx` o `ts-node-dev` con recarga automática |
| Pruebas | `jest` + `supertest` |

Puerto por defecto: `3000`, configurable con la variable de entorno `PORT`. La conexión se configura con `DATABASE_URL` (por ejemplo `postgres://postgres:postgres@localhost:5432/todo`).

## 3. Modelo de datos

```ts
export interface Task {
  id: number;            // lo asigna el servidor
  titulo: string;        // obligatorio, no vacío
  descripcion: string;   // opcional, "" por defecto
  completada: boolean;   // false por defecto
  photoUri?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: string;     // ISO, lo asigna el servidor
  updatedAt: string;     // ISO, se actualiza en cada cambio
}
```

### Tabla `tasks`

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  titulo      VARCHAR(120)     NOT NULL CHECK (titulo <> ''),
  descripcion TEXT             NOT NULL DEFAULT '',
  completada  BOOLEAN          NOT NULL DEFAULT false,
  photo_uri   TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  address     TEXT,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);
```

La tabla se crea con `db/schema.sql`. El repositorio convierte cada fila al modelo `Task`: pasa `snake_case` a `camelCase`, junta `latitude`, `longitude` y `address` en el objeto `location`, y entrega las fechas en ISO.

Para levantar PostgreSQL en local se puede usar Docker:

```bash
docker run --name todo-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=todo -p 5432:5432 -d postgres:16
```

## 4. Endpoints

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/tasks` | Lista todas las tareas | `200` + arreglo de `Task` |
| `GET` | `/tasks/:id` | Obtiene una tarea | `200` + `Task`, o `404` |
| `POST` | `/tasks` | Crea una tarea | `201` + `Task` creada, o `400` si falta `titulo` |
| `PUT` | `/tasks/:id` | Reemplaza una tarea | `200` + `Task`, `400` o `404` |
| `PATCH` | `/tasks/:id` | Actualiza campos sueltos (por ejemplo `completada`) | `200` + `Task`, `400` o `404` |
| `DELETE` | `/tasks/:id` | Elimina una tarea | `204`, o `404` |
| `GET` | `/health` | Verifica que el servidor esté arriba | `200` + `{ "status": "ok" }` |

Filtro opcional: `GET /tasks?completada=true|false`.

Formato de error (todas las rutas):

```json
{ "error": "Mensaje en español" }
```

## 5. Estructura de proyecto

```
api/
├── src/
│   ├── index.ts              # arranque del servidor
│   ├── app.ts                # Express, middlewares y rutas (se exporta para las pruebas)
│   ├── routes/
│   │   └── tasks.ts          # rutas /tasks
│   ├── controllers/
│   │   └── tasksController.ts
│   ├── db/
│   │   ├── pool.ts           # Pool de pg con DATABASE_URL
│   │   ├── schema.sql        # CREATE TABLE tasks
│   │   ├── migrate.ts        # ejecuta schema.sql
│   │   └── seed.ts           # inserta 2 o 3 tareas de ejemplo
│   ├── repository/
│   │   └── tasksRepository.ts  # consultas SQL
│   └── types/
│       └── Task.ts
├── .env.example              # DATABASE_URL y PORT
├── __tests__/
│   └── tasks.test.ts
├── package.json
└── tsconfig.json
```

Regla: solo `tasksRepository.ts` hace consultas a la base, siempre con parámetros (`$1`, `$2`, ...) para evitar inyección SQL. Las pruebas usan una base aparte (`todo_test`, definida en `DATABASE_URL` del entorno de prueba) y vacían la tabla antes de cada prueba para no tocar la real.

## 6. Scripts

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "migrate": "tsx src/db/migrate.ts",
  "seed": "tsx src/db/seed.ts"
}
```

## 7. Pruebas automatizadas

| Prueba | Qué verifica |
|--------|--------------|
| Listar | `GET /tasks` devuelve `200` y un arreglo. |
| Crear | `POST /tasks` devuelve `201`, asigna `id`, `createdAt` y `updatedAt`. |
| Crear inválida | `POST /tasks` sin `titulo` devuelve `400` con `error`. |
| Obtener | `GET /tasks/:id` devuelve la tarea, o `404` si no existe. |
| Actualizar | `PUT` y `PATCH` cambian los campos y actualizan `updatedAt`. |
| Eliminar | `DELETE /tasks/:id` devuelve `204` y la tarea ya no aparece. |
| Filtro | `GET /tasks?completada=true` devuelve solo las completadas. |

## 8. Criterios de aceptación

- [ ] Con PostgreSQL corriendo y `DATABASE_URL` configurada, `npm run dev` levanta la API en `http://localhost:3000`.
- [ ] Todos los endpoints responden con los códigos de la sección 4.
- [ ] Los datos se mantienen al reiniciar el servidor (quedan en PostgreSQL).
- [ ] `npm run migrate` crea la tabla `tasks`.
- [ ] `npm run seed` carga las tareas de ejemplo.
- [ ] Los errores devuelven `{ "error": ... }` en español.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm test` pasa todas las pruebas.
