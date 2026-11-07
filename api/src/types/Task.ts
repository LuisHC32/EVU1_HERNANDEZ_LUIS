export interface Task {
  id: number;
  titulo: string;
  descripcion: string;
  completada: boolean;
  photoUri?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}
