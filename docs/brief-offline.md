# Brief: Guardado local y cola sin conexión

## 1. Objetivo

Que la app guarde siempre las tareas en el dispositivo y envíe los cambios a la API (`api/`, Express + PostgreSQL). Si no hay internet, los cambios quedan en una cola local y se envían solos cuando vuelve la conexión, sin perder datos ni duplicar tareas.

## 2. Requisitos funcionales

| # | Requisito | Detalle |
|---|-----------|---------|
| RF10 | Local primero | Crear, editar, completar y eliminar una tarea se guarda al instante en `AsyncStorage` (ya existe en `services/storage.ts`) y la UI no espera a la red. |
| RF11 | Cola de operaciones | Cada cambio agrega una operación a una cola persistente en `AsyncStorage` (`create`, `update` o `delete`). La cola sobrevive al cierre de la app. |
| RF12 | Envío con conexión | Si hay conexión, la cola se procesa en orden: `POST /tasks`, `PUT /tasks/:id` o `DELETE /tasks/:id`. Cada operación enviada con éxito se saca de la cola. |
| RF13 | Reintento al reconectar | Al recuperar la conexión, y al abrir la app, la cola se procesa sola. Si una operación falla por red o por un error 5xx, se detiene el proceso y se reintenta en la siguiente reconexión. |
| RF14 | Estado visible | Cada tarjeta muestra si la tarea está sincronizada (`cloud-check`) o pendiente (`cloud-upload-outline`). Un `Banner` o `Snackbar` avisa "Sin conexión, los cambios se enviarán al reconectar" y "N cambios sincronizados". |

## 3. Modelo

Se agregan campos a `Task` (app):

```ts
export type Task = {
  // ...campos actuales (id, titulo, descripcion, completada, createdAt, photoUris?, location?)
  remoteId?: number;    // id que asigna la API (SERIAL)
  updatedAt?: string;   // ISO, último cambio local
  syncedAt?: string;    // ISO, último envío correcto
};
```

Operación de la cola:

```ts
export type PendingOp = {
  opId: string;                       // id único de la operación
  type: 'create' | 'update' | 'delete';
  taskId: string;                     // id local de la tarea
  payload?: TaskPayload;              // datos a enviar (create y update)
  createdAt: string;                  // ISO
  attempts: number;
};
```

`TaskPayload` usa el formato de la API: `titulo`, `descripcion`, `completada`, `photoUri` y `location`.

## 4. Reglas de la cola

- **Compactar**: si ya hay un `create` pendiente de la misma tarea, un `update` reemplaza su `payload` en vez de agregar otra operación. Un `delete` de una tarea que nunca llegó a la API borra sus operaciones pendientes y no envía nada.
- **Orden**: las operaciones se envían en el orden en que se crearon, de a una.
- **Ids**: al terminar un `create`, se guarda el `id` de la respuesta como `remoteId`. Los `update` y `delete` usan ese `remoteId` en la URL.
- **Errores 4xx**: no se reintentan. La operación sale de la cola y queda registrada en consola para revisarla.
- **Una sola ejecución**: si la cola ya se está procesando, una nueva llamada no inicia otro proceso.
- **Fotos**: la API guarda un solo `photo_uri`, y la app maneja `photoUris` (arreglo). Se envía la primera foto, o se cambia la columna de la API a `photo_uris TEXT[]`. Hay que elegir una opción y dejarla igual en la app y en la API.

## 5. Stack

| Necesidad | Librería |
|-----------|----------|
| Estado de la red | `@react-native-community/netinfo` (`npx expo install @react-native-community/netinfo`) |
| Persistencia local | `@react-native-async-storage/async-storage` (ya instalado) |
| HTTP | `fetch` con timeout usando `AbortController` |
| URL de la API | `EXPO_PUBLIC_API_URL` en un `.env` de la app. En el celular se usa la IP de la red local del computador (por ejemplo `http://192.168.1.10:3000`), no `localhost`. |

## 6. Estructura

```
src/
├── services/
│   ├── storage.ts         # ya existe
│   ├── api.ts             # NUEVO: createTask / updateTask / deleteTask contra la API
│   ├── queue.ts           # NUEVO: enqueue, loadQueue, saveQueue, compactar
│   ├── sync.ts            # NUEVO: processQueue (envía en orden y actualiza remoteId/syncedAt)
│   └── network.ts         # NUEVO: suscripción a NetInfo, isOnline()
├── context/
│   └── TasksContext.tsx   # cada acción guarda en local + enqueue; dispara processQueue al reconectar
└── components/
    └── TaskItem.tsx       # + ícono de sincronizada o pendiente
```

Regla: el contexto y las pantallas no llaman a `fetch` ni a `NetInfo` directamente; todo pasa por `src/services/`.

## 7. Pruebas automatizadas

Se simulan `global.fetch`, `AsyncStorage` y `NetInfo`.

| Prueba | Qué verifica |
|--------|--------------|
| Sin conexión | Crear una tarea la guarda en local y deja una operación `create` en la cola, sin llamar a `fetch`. |
| Cola persistente | La cola guardada se vuelve a cargar igual al reiniciar. |
| Reconexión | Al pasar a "con conexión", se envían las operaciones en orden y la cola queda vacía. |
| `remoteId` | Después de un `create`, la tarea guarda el `id` de la API, y el siguiente `update` usa `PUT /tasks/:remoteId`. |
| Compactar | `create` + `update` de la misma tarea sin conexión resulta en un solo `POST` con los datos finales. |
| Crear y borrar sin conexión | No se envía nada a la API. |
| Fallo de red a mitad | Si la segunda operación falla, la primera sale de la cola y la segunda queda pendiente. |
| Error 4xx | La operación se descarta y no bloquea las siguientes. |

## 8. Criterios de aceptación

- [ ] Con el modo avión activado se pueden crear, editar y eliminar tareas, y quedan guardadas al cerrar y abrir la app.
- [ ] Las tareas pendientes muestran el ícono de pendiente y se ve el aviso de sin conexión.
- [ ] Al desactivar el modo avión, los cambios llegan a PostgreSQL (se ven con `GET /tasks`) y las tarjetas pasan a sincronizadas.
- [ ] No se crean tareas duplicadas en la API.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm test` pasa todas las pruebas de la cola.
