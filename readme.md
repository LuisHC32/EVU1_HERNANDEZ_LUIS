# Evaluacion 1 DESARROLLO DE APLICACIONES MÓVILES
**Alumno:** Luis Hernandez.
**Profesor:** Boris Belmar.
**Institución:** IPSS.

# To-Do List

Aplicación móvil para registrar, buscar, editar y eliminar tareas pendientes. Cada tarea tiene título y descripción. El título es obligatorio.

La interfaz usa Material Design 3 (React Native Paper). Las tareas se guardan en memoria: al cerrar la aplicación se pierden.

## Cómo ejecutarla

Requiere Node.js LTS y [Expo Go](https://expo.dev/go) actualizado (SDK 58).

```bash
npm install
npx expo start
```

## Pantallas

### Inicio

Si no hay tareas, la lista muestra el estado vacío y el botón para crear la primera. El botón **+** abre el formulario.

![Pantalla de inicio sin tareas](imgs/Inicio.jpeg)

### Crear tarea

El formulario pide el título (máximo 120 caracteres) y una descripción opcional. Si el título está vacío, no se guarda y se muestra el error.

![Formulario de nueva tarea](imgs/Crear%20Tarea.jpeg)

Al guardar, vuelve a la lista y aparece el aviso **Tarea guardada**. El contador indica cuántas tareas están activas.

![Tarea creada](imgs/CrearTarea%20Exitosamente.jpeg)

### Editar tarea

El ícono de lápiz abre la misma pantalla con los datos de la tarea. La cabecera dice **Editar tarea** y el botón **Actualizar tarea**.

![Formulario de edición](imgs/Editar%20Tarea.jpeg)

Al guardar, vuelve a la lista y aparece el aviso **Tarea actualizada correctamente**.

![Tarea actualizada](imgs/Editar%20Tarea%20Exitosamente.jpeg)

### Marcar como realizada

El círculo de cada tarjeta cambia el estado. La tarea realizada muestra una palomita y deja de contarse como activa. Sigue visible en la lista.

![Tarea marcada como realizada](imgs/Tarea%20realizada.jpeg)

### Buscar

La lupa abre el buscador en la cabecera. Filtra por título y descripción, sin distinguir mayúsculas ni acentos. El contador pasa a mostrar los resultados.

![Buscador abierto](imgs/Buscar%20Tarea.jpeg)

![Lista filtrada](imgs/Buscar%20Tarea%20Filtrado.jpeg)

### Eliminar

El ícono de basurero pide confirmación. **Cancelar** cierra el diálogo. **Eliminar** quita la tarea y muestra **Tarea eliminada**, con la opción **Deshacer**.

![Confirmación para eliminar](imgs/Eliminar%20Tarea.jpeg)

![Tarea eliminada](imgs/Eliminar%20Tarea%20Exitosamente.jpeg)

## Tecnologías

- Expo SDK 58 y React Native
- TypeScript
- React Navigation (pila: lista y formulario)
- React Native Paper, tema claro de Material Design 3
- Estado con `useState` y `useContext`
