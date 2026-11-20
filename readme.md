# Evaluacion 2 DESARROLLO DE APLICACIONES MÓVILES
**Alumno:** Luis Hernandez.
**Profesor:** Boris Belmar.
**Institución:** IPSS.

La parte 1 ya permitía listar, crear, editar, buscar, completar y eliminar tareas. Ese recorrido, con sus capturas, quedó en [docs/readmev1.md](docs/readmev1.md) (`imgs/imgsv1/`). Aquí documento solo lo que se suma: foto, ubicación, permisos, guardado en el dispositivo y envío a la API.

| # | Requisito | Cómo quedó |
|---|-----------|------------|
| RF6 | Capturar imagen | En el formulario, **Tomar foto** abre la cámara y **Galería** permite elegir una o varias imágenes. Cada foto se ve en miniatura y se puede quitar. En la lista, un chip abre la foto. |
| RF7 | Registrar ubicación | Al guardar una tarea nueva se piden latitud y longitud. Si el GPS devuelve una dirección, se guarda; el usuario también puede escribirla. La tarjeta muestra un chip con ícono `map-marker`. |
| RF8 | Permisos | Cámara y galería se piden al tocar el botón. La ubicación se pide solo al guardar una tarea nueva. Si se niegan, un aviso lo explica y la tarea se guarda igual. |
| RF9 | Almacenamiento local | `AsyncStorage` guarda el arreglo de tareas. Al abrir la app se vuelve a cargar, también sin conexión. |
| RF10 | Sincronizar con la API | Cada alta, edición, completado o borrado queda primero en el teléfono y entra a una cola (`task-ops`). El ícono de la tarjeta envía esa tarea: `POST /tasks`, `PUT /tasks/:id` o `DELETE /tasks/:id`. Con respuesta correcta la tarjeta muestra el visto. |

## Estructura de archivos

```
EVU1_HERNANDEZ_LUIS/
├── index.ts          # registerRootComponent(App)
├── App.tsx           # Proveedores (SafeArea, Paper, Tasks) y navegación en pila
├── app.json          # Expo y plugins de cámara y ubicación (textos en español)
├── package.json      # Dependencias, script test y preset jest-expo
├── jest.setup.js     # Simula AsyncStorage y NetInfo
├── assets/ · imgs/   # Íconos/splash y capturas nuevas (las de la parte 1 están en imgs/imgsv1)
├── __tests__/        # cámara, GPS, almacenamiento, formulario, cola y sincronización
├── api/              # Express + PostgreSQL: CRUD de tareas
└── src/
    ├── components/   # TaskItem, Header, PrimaryButton, PhotoPicker
    ├── context/      # TasksContext.tsx: estado global, hydrate/persist y syncTask
    ├── screens/      # TaskListScreen.tsx, TaskFormScreen.tsx
    ├── services/     # camera, location, storage, api, queue, sync, network
    ├── constants/    # messages.ts: textos de sincronización
    ├── theme/        # theme.ts: paleta y tema MD3
    └── types/        # Task.ts, navigation.ts
```

- `index.ts`: Punto de entrada (`"main"` en `package.json`).
- `src/components/`: Componentes visuales por props. `PhotoPicker` arma los botones de foto y las miniaturas. `TaskItem` muestra el chip de fotos y el de ubicación.
- `src/context/TasksContext.tsx`: Fuente de datos. Al montar llama `loadTasks()` y, cuando el estado ya está hidratado, persiste cada cambio con `saveTasks()`.
- `src/screens/`: Una pantalla por ruta; leen el estado con `useTasks()`. No importan `expo-*` ni `AsyncStorage`.
- `src/services/`: Único lugar que habla con la cámara, el GPS, el almacenamiento y la API. Las pantallas no importan `fetch` ni NetInfo.
- `src/theme/theme.ts`: `palette` (estilos) y `theme` (para `PaperProvider`).
- `src/types/`: `Task` incluye `photoUris?`, `location?` y el estado de sincronización (`remoteId?`, `updatedAt?`, `syncedAt?`).

```ts
export type Task = {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
  createdAt: string;
  photoUris?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  remoteId?: number;   // id SERIAL que asigna la API
  updatedAt?: string;  // último cambio en el teléfono
  syncedAt?: string;   // último envío que coincidió con lo guardado
};
```

La galería puede devolver varias fotos, así que el modelo usa `photoUris` (arreglo). Si en el almacenamiento queda una tarea vieja con un solo `photoUri`, `loadTasks` la lee como lista de un elemento. La API guarda una sola `photo_uri`: se envía la primera foto como texto, no el archivo.

## Sincronización con la API

La lista no espera a la red. Crear, editar, completar o eliminar escribe en AsyncStorage (clave `tasks`) y agrega una operación a la cola (clave `task-ops`). Esa cola sobrevive al cerrar la app. La tarjeta queda **Sin sincronizar** hasta que el envío responde bien: tener red no manda el alta sola.

`EXPO_PUBLIC_API_URL` en `.env` es la base. En el celular va la IP del computador (`http://192.168.1.10:3000`), no `localhost`. Sin esa variable la lista sigue en local y el ícono avisa que no pudo conectar con el servidor.

El ícono `sync` de la tarjeta llama a `syncTask` solo para esa tarea:

| Estado local | Petición |
|---|---|
| Sin `remoteId` | `POST /tasks`. El `id` de la respuesta queda en `remoteId`. |
| Con `remoteId` | `PUT /tasks/:remoteId`. |
| Borrado con `remoteId` y con red | `DELETE /tasks/:remoteId` en el momento, sin esperar el ícono. |
| Borrado sin `remoteId` | No llama a la API: se quitan las operaciones de esa tarea. |

La cola se compacta antes de guardarse. Varios cambios de una tarea nueva quedan en un solo `POST` con los datos finales. Dos ediciones de una tarea ya creada se fusionan en un `PUT`. Editar y borrar una tarea sincronizada deja solo el `DELETE`.

Cada petición corta a los 8 s. Un `2xx` saca la operación, guarda `remoteId` y, si el cuerpo coincide con la tarea local, marca `syncedAt`: ahí aparece el visto. Un `4xx` saca la operación, no reintenta y avisa **No se pudo sincronizar: la API rechazó la tarea.** Un `5xx`, un corte o el tiempo agotado dejan la operación para el próximo intento y avisan **No se pudo conectar con el servidor.** Si el `PUT` responde `404`, se olvida el `remoteId` viejo y se crea de nuevo con `POST`.

Al abrir la app, al volver la red, al pasar a primer plano o al deslizar la lista, `GET /tasks` contrasta los ids. Si el `remoteId` ya no está en el servidor, se quitan `remoteId` y `syncedAt` y la tarjeta vuelve a poder enviarse. Ese contraste no vacía la cola: las pendientes siguen hasta pulsar el ícono.

La API (Express, puerto `3000`) expone `GET /health`, `GET /tasks` (filtro `?completada=true|false`), `GET /tasks/:id`, `POST`, `PUT`, `PATCH` y `DELETE`. PostgreSQL persiste título, descripción, `completada`, `photo_uri`, latitud, longitud y dirección. Los errores responden `{ "error": "..." }` en español. Solo `api/src/repository/tasksRepository.ts` escribe SQL, con parámetros.

```bash
cp .env.example .env
cp api/.env.example api/.env
npm install --prefix api
npm run migrate --prefix api
npm run dev --prefix api
```

`api/.env.example` usa `postgres://postgres:postgres@localhost:5432/todo`. `npm run seed --prefix api` carga tareas de ejemplo. `npm test --prefix api` cubre el CRUD con Supertest.

## Conceptos fundamentales de React Native

- **Plugins de Expo:** `expo-image-picker` y `expo-location` se declaran en `app.json`. El texto del permiso, en español, es el que muestra el sistema. NetInfo avisa si hay red para decidir si el cambio puede salir a la API.
- **Permisos bajo demanda:** No se piden al abrir la app. `takePhoto` y `pickFromGallery` los piden al tocar el botón. `getCurrentLocation` los pide al guardar una tarea nueva. En Android pido además el permiso nativo con `PermissionsAndroid` antes del de Expo, porque Expo Go a veces no muestra el diálogo del sistema.
- **Cámara y GPS:** `expo-image-picker` devuelve `assets[].uri`. La galería puede traer varias, y quedan en `photoUris`. `expo-location` lee la posición con precisión `Balanced` y, si puede, hace *reverse geocoding*. Si el geocodificado falla, igual guardo latitud y longitud.
- **Estado de lo nuevo:** En el formulario, `photoUris`, `address`, `locating` y `notice`. En el contexto, `offline`, `pending`, `syncingIds` y `remoteId` / `syncedAt` de cada tarea. Las fotos se actualizan de forma inmutable: `[...uris, ...result.uris]`.
- **AsyncStorage:** `tasks` guarda el arreglo, incluidas fotos, ubicación y el estado de sincronización. `task-ops` guarda la cola. Un JSON roto o un ítem inválido no tira la app: se descarta y, si no queda nada usable, se devuelve `[]`.
- **Red:** `fetch` con `AbortController` (8 s) habla con la API solo desde `src/services/api.ts`. `EXPO_PUBLIC_API_URL` es la base. El ícono de la tarjeta dispara `syncTask`; al abrir, al volver la red o al deslizar la lista, `GET /tasks` contrasta los ids.

El servicio de cámara no lanza: devuelve las uris o un motivo, y la UI decide el aviso.

```ts
// src/services/camera.ts
export type PhotoCapture =
  | { uris: string[] }
  | { uris: null; reason: 'denied' | 'cancelled' | 'error' };
```

La API usa el mismo criterio: `ok`, `drop` (4xx) o `stop` (red, 5xx o sin URL). El formulario y la lista siguen aunque el permiso o el servidor fallen.

## Patrones de diseño aplicados

- **Composición:** El formulario monta `PhotoPicker` y le pasa `uris`, `onChange` y `onNotice`. El picker no sabe cómo se guarda la tarea ni cómo se sincroniza.
- **Contenedor / presentación:** `TaskFormScreen` pide la ubicación y arma el `TaskInput`. `PhotoPicker` y los chips de `TaskItem` solo reciben datos y callbacks. El ícono de sincronizar llama a `onSync`; no hace `fetch`.
- **Hidratación y cola:** Al montar, `TasksProvider` carga `tasks` y completa la cola con `backfill`. Un `useEffect` posterior persiste cuando `hydrated` ya es verdadero, para no pisar el almacenamiento con el arreglo vacío inicial. Cada cambio local entra a `task-ops` por `enqueue`, que compacta antes de guardar.
- **Capa de servicios:** Pantallas y contexto no importan `expo-image-picker`, `expo-location`, `AsyncStorage`, `fetch` ni NetInfo. Cámara, GPS, almacenamiento, cola, HTTP y red viven en `src/services/`. Las pruebas simulan esos módulos.
- **Resultado en vez de excepción:** Permiso negado, cancelación, fallo de hardware y error de la API devuelven un motivo. La tarea se guarda igual en el teléfono.

## Componentes de UI principales

| Componente | Origen | Dónde / para qué |
|---|---|---|
| `PhotoPicker` | Propio | Cámara, galería, miniaturas y quitar foto |
| `Image` | React Native | Miniatura de 96 dp en el formulario y visor del modal |
| `ActivityIndicator` | React Native Paper | **Obteniendo ubicación…**; **Guardar tarea** queda deshabilitado |
| `TextInput` | React Native Paper | Campo **Ubicación (opcional)** |
| `Chip` | React Native Paper | **N fotos adjuntas** y `map-marker` con dirección o coordenadas |
| `IconButton` (`sync`) | React Native Paper | Envía esa tarea a la API. El visto aparece con `remoteId` y `syncedAt`. En curso muestra la carga |
| `Modal` | React Native | Foto a `cover`, flechas y contador `1 / N` |
| `Snackbar` | React Native Paper | Permiso denegado, guardado sin ubicación, sin red, tarea sincronizada o rechazo de la API |
| Aviso de la barra | Propio (`Pressable` + `Icon`) | **N pendientes** o **Sin red · N** |

## Cómo ejecutarla

Requiere Node.js LTS y [Expo Go](https://expo.dev/go) actualizado (SDK 58). La API y Postgres solo hacen falta para sincronizar.

```bash
npm install
npx expo start
npx tsc --noEmit
npm test
```

En el celular, la cámara, la galería y el GPS hay que probarlos en un dispositivo, no en el emulador web. Los textos de permiso salen de los plugins de `app.json`.

Para sincronizar hace falta PostgreSQL y la API en marcha (comandos en **Sincronización con la API**). En `.env` de la app, `EXPO_PUBLIC_API_URL` apunta a la IP del computador.

## Lo nuevo en pantalla

El alta, la búsqueda, el completado y el borrado con deshacer siguen como en la parte 1. Las capturas de abajo son solo de foto, GPS, permisos y sincronización.

### Formulario con foto y ubicación

Debajo de la descripción aparece **Imagen o comprobante (opcional)**. Sin foto dice **Agregar foto o captura**; con una, muestra la miniatura y la cruz para quitarla. **Tomar foto** y **Galería** piden el permiso en ese momento. El campo **Ubicación (opcional)** deja escribir una dirección antes de guardar.

![Nueva tarea con foto adjunta](imgs/Nueva%20Tarea.png)

### Permiso de cámara

Al tocar **Tomar foto**, Android pregunta si Expo Go puede tomar fotos. **No permitir** no bloquea el formulario: la tarea se puede guardar sin imagen. Cancelar el capturador tampoco cambia las fotos que ya estaban.

![Diálogo del sistema para la cámara](imgs/Solicitar%20Permiso%20de%20Camara.png)

### Permiso de ubicación

El GPS no se consulta al abrir la pantalla. Se pide al pulsar **Guardar tarea**, y solo si el título es válido. El diálogo ofrece ubicación precisa o aproximada.

![Diálogo del sistema para la ubicación](imgs/Solicitar%20Permiso%20de%20Ubicacion.png)

### Mientras llega el GPS

Con el permiso concedido, bajo el campo aparece **Obteniendo ubicación…** y **Guardar tarea** queda deshabilitado para no lanzar dos lecturas. En la captura el campo ya muestra **Plaza de Armas, Santiago**: si el usuario escribió una dirección, ese texto se conserva durante la espera.

![Indicador mientras se obtiene la ubicación](imgs/Obteniendo%20Ubicacion.png)

Al terminar, el indicador desaparece y el botón vuelve a estar activo. La dirección sigue en el campo. Si el usuario no escribió nada, queda la que devolvió el geocodificado. Si falla solo el geocodificado, igual se guardan latitud y longitud.

![Dirección obtenida en el formulario](imgs/Ubicacion%20Obtenida.png)

### Permiso denegado

Si se niega la ubicación, la tarea se crea igual y el aviso dice **Tarea guardada sin ubicación: permiso denegado.** La tarjeta no lleva chip de mapa. Lo mismo aplica a la foto: se guarda sin `photoUris`.

![Tarea guardada sin ubicación](imgs/Permisos%20Denegados.png)

### Tarea con foto y mapa

Con permiso, la lista muestra lo nuevo en la tarjeta: el chip **1 foto adjunta** y el chip `map-marker` con la dirección. Arriba, **1 pendiente** indica que el cambio todavía no llegó a la API. El aviso es **Tarea guardada**.

![Tarea creada con foto y ubicación](imgs/Tarea%20Agregada.png)

Tocar el chip abre el visor. El título del modal es el de la tarea, la imagen va a `cover` y el contador marca **1 / 1**. Las flechas sirven cuando hay más de una foto.

![Modal para ver la foto adjunta](imgs/Ver%20Imagen%20Modal.png)

### Editar

El lápiz abre la misma pantalla con el título, la descripción, la miniatura y la dirección. Se puede quitar la foto, tomar otra o cambiar el texto de la ubicación. **Actualizar tarea** no vuelve a leer el GPS: conserva latitud y longitud.

![Edición con la foto y la dirección ya cargadas](imgs/Editar%20Tarea.png)

### Sin red

Sin conexión la lista sigue usable. La píldora de la barra pasa a **Sin red · 2** y el `Snackbar` dice **Sin conexión. La tarea se guardó en este dispositivo; sincronízala cuando vuelva la conexión.** Hay tres tareas activas. **Enviar informe** y **Estudiar unidad 2** siguen pendientes: el ícono son las flechas, sin visto. **Comprar materiales** conserva el visto de un envío anterior. En las tres el chip muestra las coordenadas (`-33.44890, -70.66930`), no el texto de la dirección.

![Cambios guardados en el dispositivo, sin red](imgs/Sincronizacion%20Fallida.png)

### Sincronizada

Con red, ese ícono envía la tarea. En la captura **Enviar informe** está en curso (el botón gira) y el aviso ya dice **Tarea sincronizada**. **Comprar materiales** muestra el visto. **Estudiar unidad 2** sigue sin él, y la barra cuenta **1 pendiente**. Los chips siguen en coordenadas.

![Tareas sincronizadas y una todavía pendiente](imgs/Sincronizacion%20Exitosa.png)

### En la API

`GET http://localhost:3000/tasks` responde `200` con la tarea ya persistida. En la captura, **Comprar materiales** vuelve con `id`, `completada: false` y `location`: latitud `-33.4489`, longitud `-70.6693` y `address` **Plaza de Armas, Santiago**. La foto no viaja como archivo: si hay imágenes, a la API se manda solo la primera `photo_uri`, como texto.

![Respuesta de GET /tasks](imgs/API.png)

## Pruebas

`npm test` usa Jest con el preset `jest-expo`. `jest.setup.js` simula AsyncStorage. Las pruebas de periféricos simulan `expo-image-picker` y `expo-location`; las del formulario simulan `src/services/camera`, `location` y `storage`, así la pantalla no depende del hardware.

| Archivo | Qué verifica |
|---|---|
| `__tests__/camera.test.ts` | Con permiso, `takePhoto` y `pickFromGallery` devuelven las uris. Denegado o cancelado devuelve `null` y no lanza. Un fallo de la cámara devuelve `reason: 'error'`. La galería conserva todas las fotos elegidas. |
| `__tests__/location.test.ts` | Con permiso devuelve latitud, longitud y dirección. Sin dirección formateada arma una con calle, ciudad y región. Permiso negado o GPS caído no lanzan y no devuelven ubicación. Si falla solo el geocodificado, igual devuelve las coordenadas. |
| `__tests__/storage.test.ts` | `saveTasks` y `loadTasks` recuperan las mismas tareas, con fotos y ubicación. JSON corrupto o un valor que no es arreglo devuelve `[]`. Un `photoUri` antiguo se lee como `photoUris`. Los ítems inválidos se descartan y el resto se conserva. |
| `__tests__/TaskFormScreen.test.tsx` | La tarea guarda la foto tomada. Permiso de cámara denegado muestra el aviso y guarda sin foto. Cancelar no cambia las fotos. Se puede quitar una foto al editar. Con GPS concedido la tarea nueva guarda la ubicación y se ve el indicador de carga. Con GPS negado o con error se crea igual, sin `location`, y el aviso corresponde. Sin título no se llama a `getCurrentLocation`. Guardar o editar sin conexión avisa que hay que sincronizar a mano. |
| `__tests__/queue.test.ts` | Varios cambios de una tarea nueva quedan en un solo alta. Borrar una tarea nunca enviada no deja operaciones. Editar y borrar una ya sincronizada deja solo el borrado. Dos ediciones de la misma tarea remota se fusionan. |
| `__tests__/sync.test.ts` | Sin red no hay `fetch` y la operación sigue encolada. Un `500` se reintenta; un `400` se descarta y la tarea local permanece. `syncTask` envía solo la tarea elegida. Un `PUT` con `404` pasa a `POST`. `verifyWithApi` quita el visto si el id ya no está en `GET /tasks`. |
| `__tests__/TaskListScreen.test.tsx` | El ícono sincroniza una pendiente. Sin red, o si la API rechaza, el aviso corresponde. Si la tarea ya no está en la API, se quita el check. Crear con red deja la tarjeta sin visto hasta pulsar sincronizar. |

## Tecnologías

- Expo SDK 58 y React Native 0.88
- TypeScript
- React Navigation
- React Native Paper, tema claro de Material Design 3
- `expo-image-picker` y `expo-location`, usados solo desde `src/services/`
- `@react-native-async-storage/async-storage` y `@react-native-community/netinfo`
- API propia: Express, `pg` y PostgreSQL (`npm run dev --prefix api`)
- Jest, `jest-expo` y React Native Testing Library (`npm test`); Supertest en `api/` (`npm test --prefix api`)

## ¿Por qué React Native con Expo?

Elegí React Native con Expo porque ya lo había usado para desarrollar un Sudoku y la experiencia me dejó con ganas de seguir aprendiéndolo. Me gustó poder crear una aplicación y probarla al instante en el celular, a diferencia de Java, donde hay que esperar la compilación, mover e instalar el APK, y repetir todo el proceso cada vez que algo falla o quiero hacer un cambio. En esta parte eso se nota más: la cámara, el GPS y los permisos se prueban en el mismo teléfono, sin armar un proyecto nativo aparte.
