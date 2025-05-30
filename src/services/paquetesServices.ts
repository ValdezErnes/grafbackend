import fs from "fs";
import path from "path";
import os from "os";

interface NodeData {
    key: number;
    text: string;
    isGroup: boolean;
    group?: number;
}

interface GraphModel {
    nodeDataArray: NodeData[];
}

export const generarcarpetas = async (proyectFolderPath:string,nombreProyecto: string, graphModel1: string): Promise<void> => {
    
    const srcbackend = path.join(proyectFolderPath, `${nombreProyecto}-backend`, 'src');
    const srcfrontend = path.join(proyectFolderPath, `${nombreProyecto}-frontend`, 'src', 'app');

    // Parsea el modelo gráfico
    const graphModel: GraphModel = typeof graphModel1 === "string" ? JSON.parse(graphModel1) : graphModel1;
    const nodes = graphModel.nodeDataArray;

    // Construye un mapa de nodos por key
    const nodeMap = new Map<number, NodeData>();
    nodes.forEach(n => nodeMap.set(n.key, n));

    // Función recursiva para construir el path de cada nodo
    function buildPath(node: NodeData): string {
        if (node.group !== undefined && nodeMap.has(node.group)) {
            return path.join(buildPath(nodeMap.get(node.group)!), node.text);
        }
        return node.text;
    }

    // Genera los paths
    const paths = nodes.map(node => [
        path.join(srcbackend, buildPath(node)),
        path.join(srcfrontend, buildPath(node))
    ]);

    // Muestra los paths generados
    console.log("Paths generados:");
    paths.flat().forEach(p => console.log(p));

    for (const p of paths.flat()) {
        fs.mkdirSync(p, { recursive: true });
    }
}