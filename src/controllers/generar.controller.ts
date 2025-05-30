import { Request, Response } from "express";
import { Proyecto } from "../models/proyectos.model";
import { Versiones } from "../models/versiones.model";
import { createProjectBackend } from "../services/crearbackend";
import { createProjectFrontend } from "../services/crearfrontend";
import {generarcarpetas} from "../services/paquetesServices";
import { isUsernameField, isPasswordField, isUserClass, findUsernameField, findPasswordField } from "../utils/FieldsDetection";
import path from "path";
import os from "os";

export const generarproyecto = async (req: Request, res: Response) => {
    const {id,idv_cu,idv_sec,idv_paq,idv_comp,idv_class,conexion} = req.body;
    // console.log(req.body);
    try {
        const proyecto = await Proyecto.findByPk(id);
        if (!proyecto) {
            res.status(404).json({ error: "Proyecto no encontrado" });
            return;
        }
        
        const clases = await ObtenerVersion(idv_class, "Diagrama de clases", res);
        if (!clases) return;
        const secuencias = await ObtenerVersion(idv_sec, "Diagrama de secuencias", res);
        if (!secuencias) return;
        const paquetes = await ObtenerVersion(idv_paq, "Diagrama de paquetes", res);
        if (!paquetes) return;
        const componentes = await ObtenerVersion(idv_comp, "Diagrama de componentes", res);
        if (!componentes) return;
        const casosUso = await ObtenerVersion(idv_cu, "Diagrama de casos de uso", res);
        if (!casosUso) return;
        
        proyecto.Nombre = proyecto.Nombre.replace(/ /g, "_");

        const jsonData = JSON.parse(clases.json);
        
        let processedNodeArray = jsonData.nodeDataArray.map((node: any) => {
            const nodeWithoutIdProp = {
                ...node,
                properties: node.properties
                    .filter((prop: any) => prop.name.toLowerCase() !== 'id')
                    .map((prop: any) => ({
                        ...prop,
                        name: prop.name.replace(/\s+/g, '_')
                    }))
            };
            return nodeWithoutIdProp;
        });

        let userClassIndex = processedNodeArray.findIndex((node: any) => 
            isUserClass(node.name)
        );

        const loginFields = [
            { name: 'username', type: 'string', visibility: 'private' },
            { name: 'password', type: 'string', visibility: 'private' }
        ];

        if (userClassIndex !== -1) {
            const userClass = processedNodeArray[userClassIndex];
            const existingUsernameField = findUsernameField(userClass.properties);
            const existingPasswordField = findPasswordField(userClass.properties);
            if (!existingUsernameField) {
                userClass.properties.push(loginFields[0]);
            }
            if (!existingPasswordField) {
                userClass.properties.push(loginFields[1]);
            }
        } else {
            const newUserClass = {
                key: Math.max(...processedNodeArray.map((node: any) => node.key || 0)) + 1,
                name: 'Users',
                properties: loginFields,
                methods: [
                    { name: 'login', type: 'boolean', visibility: 'public' },
                    { name: 'logout', type: 'void', visibility: 'public' }
                ],
                loc: '0 0'
            };
            
            processedNodeArray.push(newUserClass);
        }

        const graphModel = {
            ...jsonData,  
            nodeDataArray: processedNodeArray
        };
        
        const graphModelString = JSON.stringify(graphModel);

        const jsonpaquetes = JSON.parse(paquetes.json);
        const desktopPath = path.join(os.homedir(), 'Proyectos');
        const projectFolderPath = path.join(desktopPath, proyecto.Nombre);
        // Creacion del boilerplate
        await createProjectBackend(proyecto.Nombre, graphModelString, conexion,projectFolderPath);
        await createProjectFrontend(proyecto.Nombre, graphModelString,conexion.puertoBackend,projectFolderPath);
        await generarcarpetas(projectFolderPath,proyecto.Nombre, jsonpaquetes);

        res.status(200).json({ message: "Proyecto generado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al generar el proyecto" });
        console.error("Error al generar el proyecto:", error);
    }
}

const ObtenerVersion = async (id: number, nombre: string, res: Response) => {
    const version = await Versiones.findByPk(id);
    if (!version) {
        res.status(404).json({ error: `Versión del Diagrama de ${nombre} no encontrada` });
        return null;
    }
    return version;
}