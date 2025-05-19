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
  { key: 1, name: "Usuario", properties: [
    { name: "Nombre", type: "string" },
    { name: "Email", type: "string" },
    { name: "Edad", type: "int" }
  ]},
  { key: 2, name: "Producto", properties: [
    { name: "Nombre", type: "string" },
    { name: "Precio", type: "float" },
    { name: "Stock", type: "int" }
  ]},
  { key: 3, name: "Categoria", properties: [
    { name: "Nombre", type: "string" },
    { name: "Descripcion", type: "string" }
  ]},
  { key: 4, name: "Orden", properties: [
    { name: "Fecha", type: "date" },
    { name: "Total", type: "float" }
  ]},
  { key: 5, name: "DetalleOrden", properties: [
    { name: "Cantidad", type: "int" },
    { name: "PrecioUnitario", type: "float" }
  ]},
  { key: 6, name: "Pago", properties: [
    { name: "Metodo", type: "string" },
    { name: "FechaPago", type: "date" }
  ]},
  { key: 7, name: "Direccion", properties: [
    { name: "Calle", type: "string" },
    { name: "Ciudad", type: "string" },
    { name: "CP", type: "string" }
  ]},
  { key: 8, name: "Proveedor", properties: [
    { name: "Nombre", type: "string" },
    { name: "Telefono", type: "string" }
  ]},
  { key: 9, name: "Inventario", properties: [
    { name: "Cantidad", type: "int" },
    { name: "Ubicacion", type: "string" }
  ]},
  { key: 10, name: "Cliente", properties: [
    { name: "Nombre", type: "string" },
    { name: "Email", type: "string" }
  ]},
  { key: 11, name: "Envio", properties: [
    { name: "FechaEnvio", type: "date" },
    { name: "Empresa", type: "string" }
  ]},
  { key: 12, name: "Descuento", properties: [
    { name: "Porcentaje", type: "float" },
    { name: "Descripcion", type: "string" }
  ]},
  { key: 13, name: "Factura", properties: [
    { name: "Numero", type: "string" },
    { name: "Fecha", type: "date" }
  ]},
  { key: 14, name: "Carrito", properties: [
    { name: "FechaCreacion", type: "date" }
  ]},
  { key: 15, name: "Reseña", properties: [
    { name: "Puntaje", type: "int" },
    { name: "Comentario", type: "string" }
  ]}
],
linkDataArray: [
  { from: 1, to: 4, category: "association" }, // Usuario - Orden
  { from: 4, to: 5, category: "aggregation" }, // Orden - DetalleOrden
  { from: 5, to: 2, category: "association" }, // DetalleOrden - Producto
  { from: 2, to: 3, category: "association" }, // Producto - Categoria
  { from: 4, to: 6, category: "association" }, // Orden - Pago
  { from: 1, to: 7, category: "association" }, // Usuario - Direccion
  { from: 2, to: 8, category: "association" }, // Producto - Proveedor
  { from: 2, to: 9, category: "aggregation" }, // Producto - Inventario
  { from: 4, to: 10, category: "association" }, // Orden - Cliente
  { from: 4, to: 11, category: "association" }, // Orden - Envio
  { from: 4, to: 12, category: "association" }, // Orden - Descuento
  { from: 4, to: 13, category: "association" }, // Orden - Factura
  { from: 1, to: 14, category: "association" }, // Usuario - Carrito
  { from: 10, to: 15, category: "association" }, // Cliente - Reseña
  { from: 15, to: 2, category: "association" }  // Reseña - Producto
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


// Llamar a la función para crear el backend
// createProjectBackend(nombreProyecto, graphModel, credenciales)
//     .then(() => {
//         console.log("✅ Proyecto backend creado con éxito.");

//         // Llamar a la función para crear el frontend
//         return createProjectFrontend(nombreProyecto, graphModel);
//     })
//     .then(() => {
//         console.log("✅ Proyecto frontend creado con éxito.");
//     })
//     .catch((error) => {
//         console.error("❌ Error al crear los proyectos:", error);
//     });
});
