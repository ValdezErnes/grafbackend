import { Request, Response } from "express";
import { Proyecto } from "../models/proyectos.model";
import { Versiones } from "../models/versiones.model";
import { createProjectBackend } from "../services/crearbackend";
import { createProjectFrontend } from "../services/crearfrontend";
import {generarcarpetas} from "../services/paquetesServices";



export const generarproyecto = async (req: Request, res: Response) => {
    const {id,idv_cu,idv_sec,idv_paq,idv_comp,idv_class,conexion} = req.body;
    // console.log(req.body);
    try {
        const proyecto = await Proyecto.findByPk(id);
        if (!proyecto) {
            res.status(404).json({ error: "Proyecto no encontrado" });
            return;
        }
        const clases = await Versiones.findByPk(idv_class);
        if (!clases) {
            res.status(404).json({ error: "Version del Diagrama de clases no encontrada" });
            return;
        }
        const secuencias = await Versiones.findByPk(idv_sec);
        if (!secuencias) {
            res.status(404).json({ error: "Version del Diagrama de secuencias no encontrada" });
            return;
        }
        const paquetes = await Versiones.findByPk(idv_paq);
        if (!paquetes) {
            res.status(404).json({ error: "Version del Diagrama de paquetes no encontrada" });
            return;
        }
        const componentes = await Versiones.findByPk(idv_comp);
        if (!componentes) {
            res.status(404).json({ error: "Version del Diagrama de componentes no encontrada" });
            return;
        }
        const casosUso = await Versiones.findByPk(idv_cu);
        if (!casosUso) {
            res.status(404).json({ error: "Version del Diagrama de casos de uso no encontrada" });
            return;
        }
        proyecto.Nombre = proyecto.Nombre.replace(/ /g, "_");

        const jsonData = JSON.parse(clases.json);
        
        // Procesar nodeDataArray para manejar propiedades
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

        // Verificar si existe una clase users o similar para login
        const userClassNames = ['user', 'users', 'usuario', 'usuarios'];
        let userClassIndex = processedNodeArray.findIndex((node: any) => 
            userClassNames.some(className => 
                node.name && node.name.toLowerCase().includes(className.toLowerCase())
            )
        );

        const loginFields = [
            { name: 'username', type: 'string', visibility: 'private' },
            { name: 'password', type: 'string', visibility: 'private' }
        ];

        if (userClassIndex !== -1) {
            // Si existe una clase user, agregar campos de login si no existen
            const userClass = processedNodeArray[userClassIndex];
            
            loginFields.forEach(loginField => {
                const fieldExists = userClass.properties.some((prop: any) => 
                    prop.name.toLowerCase().includes(loginField.name.toLowerCase()) ||
                    loginField.name.toLowerCase().includes(prop.name.toLowerCase())
                );
                
                if (!fieldExists) {
                    userClass.properties.push(loginField);
                }
            });
        } else {
            // Si no existe, crear nueva clase users
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
        // Creacion del boilerplate
        await createProjectBackend(proyecto.Nombre, graphModelString, conexion);
        await createProjectFrontend(proyecto.Nombre, graphModelString,conexion.puertoBackend);
        await generarcarpetas(proyecto.Nombre, jsonpaquetes);

        res.status(200).json({ message: "Proyecto generado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al generar el proyecto" });
        console.error("Error al generar el proyecto:", error);
    }
}