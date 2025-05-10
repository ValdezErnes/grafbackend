import "dotenv/config"
import express,{Request,Response}  from "express";
import cors from "cors";
import { router } from "./routes";
import "./models"
import {crearArchivosClase } from "./services/backendcreaservices";

import { createProjectBackend } from './services/crearbackend';
import { createProjectFrontend } from './services/crearfrontend';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*', // Cambia al origen correcto de tu frontend
  exposedHeaders: ['Authorization'] 
}));
app.use(express.json());
app.use(router);

// Ruta de prueba
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "¡Servidor con TypeScript funcionando!" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  // let  clase
  // clase = { nombre: "alumnos", atributos: ["nombre", "apellido", "edad"] };
  //crearArchivosClase(clase,"C:/proyectos/miProyecto/miBackend")


const nombreProyecto = "MiProyecto";

// Modelo gráfico para el backend
const graphModel = JSON.stringify({
    nodeDataArray: [
        {
            key: 1,
            name: "Usuario",
            properties: [
                { name: "Nombre", type: "string" },
                { name: "Email", type: "string" },
                { name: "Edad", type: "int" }
            ]
        },
        {
            key: 2,
            name: "Producto",
            properties: [
                { name: "Nombre", type: "string" },
                { name: "Precio", type: "float" },
                { name: "Stock", type: "int" }
            ]
        }
    ],
    linkDataArray: [
        { from: 1, to: 2, category: "aggregation" }
    ]
});

// Credenciales para la base de datos
const credenciales = {
    host: "localhost",
    usuario: "root",
    password: "password",
    nombreDB: "mi_base_de_datos",
    dialecto: "mysql2",
    puertoDB: "3306",
    puertoBackend: "3000"
};

// Clases para el frontend
const clases = [
    { name: "Usuario", properties: [{ name: "Nombre", type: "string" }, { name: "Email", type: "string" }] },
    { name: "Producto", properties: [{ name: "Nombre", type: "string" }, { name: "Precio", type: "float" }] }
];

// Llamar a la función para crear el backend
createProjectBackend(nombreProyecto, graphModel, credenciales)
    .then(() => {
        console.log("✅ Proyecto backend creado con éxito.");

        // Llamar a la función para crear el frontend
        return createProjectFrontend(nombreProyecto, clases);
    })
    .then(() => {
        console.log("✅ Proyecto frontend creado con éxito.");
    })
    .catch((error) => {
        console.error("❌ Error al crear los proyectos:", error);
    });
});
