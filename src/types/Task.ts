export type Task = {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
};

export type TaskInput = {
  titulo: string;
  descripcion: string;
};
