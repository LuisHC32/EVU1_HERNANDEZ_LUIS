# Brief: Parte 2

## 1. Objetivo

Ampliar la app To-Do List de la parte 1 (Expo + React Native + React Native Paper) con interacción con periféricos (cámara y GPS), almacenamiento local sin conexión y pruebas automatizadas de los periféricos.

## 2. Requisitos funcionales

| # | Requisito | Detalle |
|---|-----------|---------|
| RF6 | Capturar imagen | Desde el formulario se puede tomar una foto con la cámara o elegirla de la galería y adjuntarla a la tarea. Se ve una miniatura en el formulario y en la tarjeta de la lista, y se puede quitar o cambiar al editar. |
| RF7 | Registrar ubicación | Al crear una tarea se guardan la latitud y la longitud con GPS, y la dirección aproximada si está disponible. La tarjeta muestra un chip con la ubicación. |
| RF8 | Permisos | Se piden los permisos de cámara y de ubicación. Si el usuario los niega, se muestra un mensaje claro y la tarea se guarda igual, sin foto o sin ubicación. |
| RF9 | Almacenamiento local | Las tareas se guardan en el dispositivo y se cargan al abrir la app, incluso sin conexión. |

### Modelo `Task` ampliado

```ts
export interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
  createdAt: string;          // ISO
  photoUri?: string;          // RF6
  location?: {                // RF7
    latitude: number;
    longitude: number;
    address?: string;
  };
}
```

## 3. Orden de implementación

Se implementa por etapas. Cada etapa debe quedar funcionando, con `npx tsc --noEmit` y sus pruebas pasando, antes de seguir con la siguiente.

| Etapa | Qué se implementa | Requisitos | Pruebas de la etapa |
|-------|-------------------|------------|---------------------|
| 1. Imágenes | `services/camera.ts`, `components/PhotoPicker.tsx`, campo `photoUri` en `Task`, miniatura en `TaskItem`, plugin de `expo-image-picker` en `app.json` | RF6, RF8 (cámara) | Cámara: concedido, negado, cancelada |
| 2. Coordenadas | `services/location.ts`, campo `location` en `Task`, captura al crear la tarea, `Chip` `map-marker` en `TaskItem`, plugin de `expo-location` en `app.json` | RF7, RF8 (ubicación) | GPS: concedido, negado o error |
| 3. Almacenamiento local | `services/storage.ts`, hydrate/persist en `TasksContext` | RF9 | Almacenamiento |

La configuración de Jest (sección 7) se deja lista en la etapa 1, porque las pruebas de cámara son las primeras.

## 4. Stack tecnológico (se suma a la parte 1)

| Necesidad | Librería |
|-----------|----------|
| Cámara y galería | `expo-image-picker` (`npx expo install expo-image-picker`) |
| GPS | `expo-location` (`npx expo install expo-location`) |
| Almacenamiento local | `@react-native-async-storage/async-storage` (`npx expo install ...`) |
| Pruebas | `jest`, `jest-expo`, `@testing-library/react-native` |

Los permisos se declaran en `app.json` con los plugins de `expo-image-picker` y `expo-location` (textos de permiso en español).

## 5. Componentes de UI nuevos (React Native Paper)

| Elemento | Componente |
|----------|------------|
| Botones de foto | `Button` (`mode="outlined"`, íconos `camera` / `image`) |
| Vista previa de la foto | `Card.Cover` o `Image` con botón para quitarla (`IconButton` `close`) |
| Ubicación | `Chip` con ícono `map-marker` |
| Carga | `ActivityIndicator` mientras se obtiene la ubicación |
| Feedback | `Snackbar` (ya existe) para avisos de permisos |

## 6. Estructura de proyecto

```
src/
├── components/
│   ├── Header.tsx
│   ├── TaskItem.tsx          # + miniatura y chip de ubicación
│   ├── PhotoPicker.tsx       # NUEVO: botones de cámara y galería y vista previa
│   └── PrimaryButton.tsx
├── screens/
│   ├── TaskListScreen.tsx
│   └── TaskFormScreen.tsx    # + PhotoPicker + captura de ubicación al crear
├── context/
│   └── TasksContext.tsx      # + hydrate/persist
├── services/                 # NUEVO
│   ├── storage.ts            # loadTasks / saveTasks (AsyncStorage)
│   ├── camera.ts             # takePhoto / pickFromGallery (permisos incluidos)
│   └── location.ts           # getCurrentLocation (permisos + reverse geocode)
├── types/
│   └── Task.ts               # modelo ampliado
└── theme/
    └── theme.ts
__tests__/                    # NUEVO
├── camera.test.ts
├── location.test.ts
├── storage.test.ts
└── TaskFormScreen.test.tsx
```

Regla: las pantallas y el contexto **no** importan `expo-*` ni `AsyncStorage` directamente; todo pasa por `src/services/`. Así las pruebas solo simulan los servicios.

## 7. Pruebas automatizadas

Configuración en `package.json`:

```json
"scripts": { "test": "jest" },
"jest": { "preset": "jest-expo" }
```

Se simulan (`jest.mock`) `expo-image-picker`, `expo-location` y `@react-native-async-storage/async-storage`.

| Prueba | Qué verifica |
|--------|--------------|
| Cámara, permiso concedido | `takePhoto()` devuelve la `uri` y la tarea guarda `photoUri`. |
| Cámara, permiso negado | No lanza error, devuelve `null` y la UI muestra el aviso. |
| Cámara, cancelada | Si el usuario cancela, no cambia `photoUri`. |
| GPS, permiso concedido | `getCurrentLocation()` devuelve lat/long (+ dirección) y la tarea nueva las guarda. |
| GPS, permiso negado o error | La tarea se crea igual, sin `location`. |
| Almacenamiento | `saveTasks` y `loadTasks` recuperan las mismas tareas, y los datos corruptos devuelven `[]`. |

## 8. Usabilidad

- Pedir permisos solo cuando hacen falta (al tocar "Tomar foto" o al guardar una tarea nueva), con un texto que explique para qué.
- Nunca bloquear el guardado por falta de foto o ubicación.
- Indicador de carga mientras se obtiene la ubicación.
- Miniaturas con `resizeMode="cover"` y tamaño fijo para no romper el ritmo de la lista (grilla de 8 dp).
- Mantener las áreas táctiles de 48 dp y el contraste WCAG AA de la parte 1.

## 9. Criterios de aceptación

- [ ] `npx expo start` levanta la app sin errores en Expo Go.
- [ ] Se puede adjuntar una foto con la cámara o la galería, y se ve en el formulario y en la lista.
- [ ] Las tareas nuevas guardan la ubicación y se ve en la tarjeta.
- [ ] Si se niegan los permisos, la app no se cae y la tarea se guarda.
- [ ] Las tareas persisten al cerrar y abrir la app, incluso sin conexión.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm test` pasa todas las pruebas de cámara, GPS y almacenamiento.
