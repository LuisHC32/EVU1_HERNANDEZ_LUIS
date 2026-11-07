import { Router } from 'express';
import * as tasks from '../controllers/tasksController';

export const tasksRouter = Router();

tasksRouter.get('/', tasks.list);
tasksRouter.get('/:id', tasks.getOne);
tasksRouter.post('/', tasks.create);
tasksRouter.put('/:id', tasks.replace);
tasksRouter.patch('/:id', tasks.update);
tasksRouter.delete('/:id', tasks.remove);
