import path from 'path';
import { pool } from './pool';

const samples = [
  ['Estudiar TypeScript', 'Repasar tipos y async', false],
  ['Comprar pan', '', false],
  ['Entregar la evaluación', 'Subir el repositorio', true],
] as const;

export async function seed(): Promise<void> {
  const count = await pool.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM tasks');
  if (Number(count.rows[0]?.n) > 0) {
    console.log('La tabla ya tiene tareas; no se insertó nada.');
    return;
  }
  for (const [titulo, descripcion, completada] of samples) {
    await pool.query(
      'INSERT INTO tasks (titulo, descripcion, completada) VALUES ($1, $2, $3)',
      [titulo, descripcion, completada],
    );
  }
  console.log('Se insertaron 3 tareas de ejemplo.');
}

if (path.basename(process.argv[1] ?? '') === 'seed.ts') {
  seed()
    .then(() => pool.end())
    .catch((err: unknown) => {
      console.error(err);
      return pool.end().finally(() => process.exit(1));
    });
}
