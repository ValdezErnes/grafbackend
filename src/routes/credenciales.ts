// Rutas de credenciales

import { Router } from 'express';
import { getAllbyProject, createCredencial, updateCredencial, deleteCredencial } from '../controllers/credenciales.controller';

const router = Router();

router.get('/:id', getAllbyProject);
router.post('/', createCredencial);
router.put('/:id', updateCredencial);
router.delete('/:id', deleteCredencial);

export {router};