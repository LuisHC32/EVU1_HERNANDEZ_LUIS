# Brief

## 1. Objetivo

Crear una aplicación móvil básica de lista de tareas (To-Do List) que permita registrar y visualizar tareas pendientes. 

## 2. Requisitos funcionales

| # | Requisito | Detalle |
|---|-----------|---------|
| RF1 | Listar tareas | La pantalla principal muestra todas las tareas con título y descripción. |
| RF2 | Agregar tarea | Formulario con campo de título y de descripción, más un botón Guardar. Los campos se limpian después de guardar. |
| RF3 | Editar tarea | Permite modificar el título y la descripción de una tarea existente. |
| RF4 | Eliminar tarea | Cada tarea tiene su propio botón para eliminarla. |
| RF5 | Validación | No se permite guardar una tarea sin título. |

Cada tarea tiene los campos `id`, `titulo` y `descripcion`.

## 3. Stack tecnológico

- Node.js (LTS)
- Expo (SDK actual) con `create-expo-app` y la plantilla en blanco, en TypeScript
- React Native
- **React Native Paper** (implementación de Material Design 3 para React Native), con su tema `MD3LightTheme`
- React Navigation (pila con las pantallas Lista y Formulario)
- Estado: `useState`/`useContext` (más adelante se puede pasar a AsyncStorage)
- Ejecución: `npx expo start` (Android/iOS con Expo Go)

## 4. Componentes de UI (Material Design 3, React Native Paper)

| Elemento | Componente |
|----------|------------|
| Cabecera | `Appbar.Header` / `Appbar.Content` |
| Contenedor de pantalla | `SafeAreaView` + `Surface` |
| Lista de tareas | `FlatList` con `List.Item` o `Card` |
| Ítem de tarea | `Card` (título y descripción) con `IconButton` para editar y eliminar |
| Campos del formulario | `TextInput` (`mode="outlined"`) + `HelperText` para validar |
| Botón para guardar | `Button` (`mode="contained"`) |
| Botón para agregar | `FAB` |
| Confirmar al eliminar | `Portal` + `Dialog` |
| Feedback | `Snackbar` ("Tarea guardada", "Tarea eliminada") |
| Estado vacío | `Icon` + `Text` (variant `bodyLarge`) |

## 5. Estructura de proyecto sugerida

```
EVU1_HERNANDEZ_LUIS/
├── App.tsx                  # Punto de entrada, NavigationContainer
├── app.json                 # Configuración de Expo
├── package.json
└── src/
    ├── components/
    │   ├── Header.tsx
    │   ├── TaskItem.tsx      # Título, descripción y botones Editar/Eliminar
    │   └── PrimaryButton.tsx
    ├── screens/
    │   ├── TaskListScreen.tsx  # Lista de tareas y botón para agregar
    │   └── TaskFormScreen.tsx  # Formulario para crear y editar
    ├── context/
    │   └── TasksContext.tsx    # Estado global y acciones add/update/remove
    ├── types/
    │   └── Task.ts
    └── theme/
        └── theme.ts          # Tema Material Design 3
```

## 6. Interfaz y usabilidad

- Seguir **Material Design 3**: tema `PaperProvider` con una paleta de colores M3 (primary, secondary, surface, error) definida en `theme/theme.ts`.
- La escala tipográfica de M3: `titleMedium` para el título y `bodyMedium` para la descripción, con `onSurfaceVariant`.
- La cuadrícula de 8 dp, elevación de las tarjetas (`Card` en modo `elevated`) y bordes redondeados según M3.
- Contraste accesible (WCAG AA) y áreas táctiles de al menos 48 dp.
- Un estado vacío ("No hay tareas, agrega la primera").
- Confirmación antes de eliminar (`Dialog` de Paper).
- `FAB` para agregar tareas y `Snackbar` para confirmar las acciones.
- Teclado bien manejado (`KeyboardAvoidingView`) y validación con un mensaje cuando falta el título.
- Navegación clara entre la lista y el formulario, con botón para volver.

## 7. Criterios de aceptación

- [ ] `npx expo start` levanta la app sin errores (Expo Go).
- [ ] Se pueden agregar, editar y eliminar tareas, y el formulario se limpia al guardar.
- [ ] No se puede guardar una tarea sin título.
- [ ] La interfaz usa React Native Paper y cumple con Material Design 3.
- [ ] El código está en TypeScript y organizado en `components/`, `screens/`, `context/` y `types/`.

