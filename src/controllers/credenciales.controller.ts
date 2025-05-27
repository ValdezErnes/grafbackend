// Controlador de credenciales

import { Request, Response } from 'express';
import { Credenciales } from '../models/credenciales.model';

const getAllbyProject = async (req: Request, res: Response) => {
    try {
        const credenciales = await Credenciales.findAll({
            where: {
                ID_Proyecto: req.params.id
            }
        });
        res.status(200).json(credenciales);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las credenciales' });
    }
}

const createCredencial = async (req: Request, res: Response) => {
    try {
        const credenciales = await Credenciales.create(req.body);
        res.status(201).json(credenciales);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear las credenciales' });
    }
}

const updateCredencial = async (req: Request, res: Response) => {
    try {
        const credenciales = await Credenciales.update(req.body, {
            where: { ID: req.params.id }
        });
        res.status(200).json(credenciales);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar las credenciales' });
    }
}

const deleteCredencial = async (req: Request, res: Response) => {
    try {
        await Credenciales.destroy({
            where: { ID: req.params.id }
        });
        res.status(200).json({ message: 'Credenciales eliminadas correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar las credenciales' });
    }
}

export { getAllbyProject, createCredencial, updateCredencial, deleteCredencial };