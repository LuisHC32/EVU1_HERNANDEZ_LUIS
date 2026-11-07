import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { tasksRouter } from './routes/tasks';

type HttpError = Error & { type?: string };

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/tasks', tasksRouter);

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});
