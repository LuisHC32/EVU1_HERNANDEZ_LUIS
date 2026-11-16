import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { isOnline, listenNetInfo, subscribeOnline } from '../services/network';
import {
  backfill,
  cancelDelete,
  enqueue,
  loadQueue,
  payloadEquals,
  taskPayload,
  withStorage,
  type OpInput,
} from '../services/queue';
import { loadTasks, saveTasks } from '../services/storage';
import { processQueue } from '../services/sync';
import type { Task, TaskInput } from '../types/Task';

type TasksContextValue = {
  tasks: Task[];
  offline: boolean;
  pending: number;
  addTask: (input: TaskInput, message?: string) => void;
  updateTask: (id: string, input: TaskInput) => void;
  toggleCompleted: (id: string) => void;
  removeTask: (id: string) => void;
  restoreTask: (task: Task, index: number) => void;
  feedback: string | null;
  clearFeedback: () => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);
const OFFLINE_SAVE = 'Guardada en este dispositivo. Se sincronizará al volver la conexión.';

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function withoutSync(task: Task): Task {
  const next = { ...task, updatedAt: new Date().toISOString() };
  delete next.syncedAt;
  return next;
}

function mergeStored(snapshot: Task[], stored: Task[]): Task[] {
  return snapshot.map((task) => {
    const prev = stored.find((item) => item.id === task.id);
    if (!prev) return task;
    const next: Task = { ...task };
    if (!next.remoteId && prev.remoteId) next.remoteId = prev.remoteId;
    if (prev.syncedAt && payloadEquals(taskPayload(next), taskPayload(prev))) {
      next.syncedAt = next.syncedAt ?? prev.syncedAt;
    }
    return next;
  });
}

async function persistTasks(snapshot: Task[]): Promise<void> {
  await withStorage(async () => {
    const stored = await loadTasks();
    await saveTasks(mergeStored(snapshot, stored));
  });
}

async function writeTask(task: Task | null, input: OpInput): Promise<number> {
  const queue = await withStorage(async () => {
    const stored = await loadTasks();
    if (input.type === 'delete') {
      await saveTasks(stored.filter((item) => item.id !== input.taskId));
    } else if (task) {
      await saveTasks([task, ...stored.filter((item) => item.id !== task.id)]);
    }
    return enqueue(input);
  });
  return queue.length;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const saveChain = useRef(Promise.resolve());

  const pullSync = useCallback((stored: Task[]) => {
    setTasks((current) => mergeStored(current, stored));
  }, []);

  const syncNow = useCallback(() => {
    return processQueue()
      .then(() => withStorage(loadTasks))
      .then((stored) => {
        pullSync(stored);
        return loadQueue();
      })
      .then((queue) => setPending(queue.length))
      .catch(() => undefined);
  }, [pullSync]);

  const push = useCallback(
    (task: Task | null, input: OpInput) => {
      void writeTask(task, input)
        .then((count) => {
          setPending(count);
          if (isOnline()) return syncNow();
        })
        .catch(() => undefined);
    },
    [syncNow],
  );

  useEffect(() => {
    let cancelled = false;
    loadTasks()
      .then(async (loaded) => {
        if (cancelled) return;
        setTasks(loaded);
        setHydrated(true);
        await withStorage(() => backfill(loaded));
        if (cancelled) return;
        setPending((await loadQueue()).length);
        if (isOnline()) await syncNow();
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [syncNow]);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = tasks;
    saveChain.current = saveChain.current.catch(() => undefined).then(() => persistTasks(snapshot));
  }, [hydrated, tasks]);

  useEffect(() => {
    if (!hydrated) return;
    const unsub = subscribeOnline((online) => {
      setOffline(!online);
      if (online) void syncNow();
    });
    const stop = listenNetInfo();
    return () => {
      unsub();
      void stop.then((fn) => fn());
    };
  }, [hydrated, syncNow]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const addTask = useCallback(
    (input: TaskInput, message = 'Tarea guardada') => {
      const task: Task = {
        id: createId(),
        titulo: input.titulo,
        descripcion: input.descripcion,
        completada: false,
        createdAt: new Date().toISOString(),
        ...(input.photoUris && input.photoUris.length > 0 ? { photoUris: input.photoUris } : {}),
        ...(input.location ? { location: input.location } : {}),
      };
      setTasks((current) => [task, ...current]);
      setFeedback(isOnline() ? message : OFFLINE_SAVE);
      push(task, { type: 'create', taskId: task.id, payload: taskPayload(task) });
    },
    [push],
  );

  const updateTask = useCallback(
    (id: string, input: TaskInput) => {
      let next: Task | undefined;
      setTasks((current) =>
        current.map((task) => {
          if (task.id !== id) return task;
          next = withoutSync({
            ...task,
            titulo: input.titulo,
            descripcion: input.descripcion,
          });
          if (input.photoUris && input.photoUris.length > 0) next.photoUris = input.photoUris;
          else delete next.photoUris;
          if (input.location) next.location = input.location;
          return next;
        }),
      );
      setFeedback('Tarea actualizada correctamente');
      if (!next) return;
      push(next, { type: 'update', taskId: id, payload: taskPayload(next), remoteId: next.remoteId });
    },
    [push],
  );

  const toggleCompleted = useCallback(
    (id: string) => {
      let next: Task | undefined;
      setTasks((current) =>
        current.map((task) => {
          if (task.id !== id) return task;
          next = withoutSync({ ...task, completada: !task.completada });
          return next;
        }),
      );
      if (!next) return;
      push(next, { type: 'update', taskId: id, payload: taskPayload(next), remoteId: next.remoteId });
    },
    [push],
  );

  const removeTask = useCallback(
    (id: string) => {
      let remoteId: number | undefined;
      setTasks((current) => {
        remoteId = current.find((task) => task.id === id)?.remoteId;
        return current.filter((task) => task.id !== id);
      });
      setFeedback('Tarea eliminada');
      push(null, { type: 'delete', taskId: id, remoteId });
    },
    [push],
  );

  const restoreTask = useCallback(
    (task: Task, index: number) => {
      setTasks((current) => {
        if (current.some((item) => item.id === task.id)) return current;
        const next = [...current];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, task);
        return next;
      });
      void withStorage(() => cancelDelete(task.id))
        .then(async (cancelled) => {
          if (cancelled) return loadQueue();
          const fresh = { ...task };
          delete fresh.remoteId;
          delete fresh.syncedAt;
          setTasks((current) => current.map((item) => (item.id === task.id ? fresh : item)));
          await withStorage(async () => {
            const stored = await loadTasks();
            await saveTasks([fresh, ...stored.filter((item) => item.id !== fresh.id)]);
            return enqueue({ type: 'create', taskId: fresh.id, payload: taskPayload(fresh) });
          });
          return loadQueue();
        })
        .then((queue) => {
          setPending(queue.length);
          if (isOnline()) return syncNow();
        })
        .catch(() => undefined);
    },
    [syncNow],
  );

  const value = useMemo(
    () => ({
      tasks,
      offline,
      pending,
      addTask,
      updateTask,
      toggleCompleted,
      removeTask,
      restoreTask,
      feedback,
      clearFeedback,
    }),
    [tasks, offline, pending, addTask, updateTask, toggleCompleted, removeTask, restoreTask, feedback, clearFeedback],
  );

  if (!hydrated) return null;

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks debe usarse dentro de TasksProvider');
  return context;
}
