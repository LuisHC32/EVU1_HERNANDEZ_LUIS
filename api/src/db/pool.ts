import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Falta DATABASE_URL');
}

export const pool = new Pool({ connectionString });
