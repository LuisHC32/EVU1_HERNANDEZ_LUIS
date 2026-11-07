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
};

export type TaskInput = {
  titulo: string;
  descripcion: string;
  photoUris?: string[];
  location?: TaskLocation;
};
