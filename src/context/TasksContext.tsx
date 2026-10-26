import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Task, TaskInput } from '../types/Task';

type TasksContextValue = {
  tasks: Task[];
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskInput) => void;
  toggleCompleted: (id: string) => void;
  removeTask: (id: string) => void;
  restoreTask: (task: Task, index: number) => void;
  feedback: string | null;
  clearFeedback: () => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const addTask = useCallback((input: TaskInput) => {
    setTasks((current) => [
      {
        id: createId(),
        titulo: input.titulo,
        descripcion: input.descripcion,
        completada: false,
      },
      ...current,
    ]);
    setFeedback('Tarea guardada');
  }, []);

  const updateTask = useCallback((id: string, input: TaskInput) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, titulo: input.titulo, descripcion: input.descripcion }
          : task,
      ),
    );
    setFeedback('Tarea actualizada correctamente');
  }, []);

  const toggleCompleted = useCallback((id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completada: !task.completada } : task,
      ),
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    setFeedback('Tarea eliminada');
  }, []);

  const restoreTask = useCallback((task: Task, index: number) => {
    setTasks((current) => {
      if (current.some((item) => item.id === task.id)) {
        return current;
      }
      const next = [...current];
      const at = Math.min(Math.max(index, 0), next.length);
      next.splice(at, 0, task);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      addTask,
      updateTask,
      toggleCompleted,
      removeTask,
      restoreTask,
      feedback,
      clearFeedback,
    }),
    [
      tasks,
      addTask,
      updateTask,
      toggleCompleted,
      removeTask,
      restoreTask,
      feedback,
      clearFeedback,
    ],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe usarse dentro de TasksProvider');
  }
  return context;
}
