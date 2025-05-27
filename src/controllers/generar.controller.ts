import { Request, Response } from "express";
import { Proyecto } from "../models/proyectos.model";
import { Versiones } from "../models/versiones.model";
import { createProjectBackend } from "../services/crearbackend";
import { createProjectFrontend } from "../services/crearfrontend";



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
        // console.log("Clases.json ",clases.json);
        //quiero que en el clases.json, en el nodeDataArray, en el properties, en el name, se reemplacen los espacios por guiones y se retorne para agregarlo a graphModel, además que graphModel ya no contenga el ID de ninguna clase, este viene como properties en el prop.name
        const jsonData = JSON.parse(clases.json);
        const graphModel = {
            ...jsonData,  // Mantiene todas las propiedades originales
            nodeDataArray: jsonData.nodeDataArray.map((node: any) => {
                // Creamos un nuevo objeto para cada nodo
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
            })
        };
        
        //Quiero que se escriba todas las propiedades de cada clase de graphModel en terminal
        graphModel.nodeDataArray.forEach((node: any) => {
            console.log("Clase: ", node.name);
            node.properties.forEach((prop: any) => {
                console.log("Propiedad: ", prop.name);
            });
        });
        
        const graphModelString = JSON.stringify(graphModel);
        // Creacion del boilerplate
        await createProjectBackend(proyecto.Nombre, graphModelString, conexion);
        await createProjectFrontend(proyecto.Nombre, graphModelString);
        res.status(200).json({ message: "Proyecto generado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al generar el proyecto" });
        console.error("Error al generar el proyecto:", error);
    }
}