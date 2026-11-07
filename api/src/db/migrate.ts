import fs from 'fs';
import path from 'path';
import { pool } from './pool';

export async function migrate(): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

if (path.basename(process.argv[1] ?? '') === 'migrate.ts') {
  migrate()
    .then(() => {
      console.log('Tabla tasks lista.');
      return pool.end();
    })
    .catch((err: unknown) => {
      console.error(err);
      return pool.end().finally(() => process.exit(1));
    });
}
