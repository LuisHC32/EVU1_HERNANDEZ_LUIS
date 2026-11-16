export type TaskLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

export type Task = {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
  createdAt: string;
  photoUris?: string[];
  location?: TaskLocation;
  remoteId?: number;
  updatedAt?: string;
  syncedAt?: string;
};

export type TaskPayload = {
  titulo: string;
  descripcion: string;
  completada: boolean;
  photoUri?: string | null;
  location?: TaskLocation | null;
};

export type PendingOp = {
  opId: string;
  type: 'create' | 'update' | 'delete';
  taskId: string;
  payload?: TaskPayload;
  remoteId?: number;
  createdAt: string;
  attempts: number;
};

export type TaskInput = {
  titulo: string;
  descripcion: string;
  photoUris?: string[];
  location?: TaskLocation;
};
