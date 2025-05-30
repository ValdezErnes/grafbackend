import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { isUsernameField, isPasswordField, isUserClass, findUsernameField, findPasswordField } from "../utils/FieldsDetection";

type Credenciales = {
    host: string;
    usuario: string;
    password: string;
    nombreDB: string;
    dialecto: string;
    puertoDB: string;
    puertoBackend: string;
};

type Paths = {
    config: string;
    models: string;
    controllers: string;
    routes: string;
    middleware: string;
};

export const executeCommand = (command:string, cwd:string) => {
    return new Promise((resolve, reject) => {
        exec(command, {cwd}, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec ejecutando: ${command}\n${stderr}`);
                reject(error);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
};

const crearCarpetaSiNoExiste = (ruta:string) => {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
        console.log(`📁 Carpeta creada: ${ruta}`);
    }
};

const instalarDependenciasBackend = async (backendPath: string, dialecto: string): Promise<void> => {
    console.log('📦 Instalando dependencias del backend...');
  
    // Paquetes principales (dependencias normales)
    const dependencias = ['sequelize', dialecto, 'dotenv','express', 'cors','jsonwebtoken'];
  
    // Paquetes de desarrollo
    const devDependencias = ['nodemon', 'ts-node', 'typescript', '@types/node','@types/jsonwebtoken'];
  
  
    console.log('📦 Instalando dependencias...');
    await executeCommand(`npm install ${dependencias.join(' ')}`, backendPath);
  
    console.log('🛠 Instalando dependencias de desarrollo...');
    await executeCommand(`npm install -D ${devDependencias.join(' ')}`, backendPath);
    
    console.log('🛠 Instalando Tipos Necesarios para Typescript...');
    await executeCommand(`npm install --save-dev @types/express @types/cors`, backendPath);
    await executeCommand(`npm install --save-dev @types/node @types/sequelize @types/dotenv`, backendPath);
    
    console.log('✅ Dependencias instaladas correctamente.');
};

export const createProjectBackend = async (nombreProyecto: string,graphModel: any,credenciales: Credenciales,projectFolderPath: string): Promise<void> => {
    const backendPath = path.join(projectFolderPath, `${nombreProyecto}-backend`);
    const srcbackend = path.join(projectFolderPath, `${nombreProyecto}-backend`, 'src');

    const paths: Paths = {
        config: path.join(backendPath, 'src', 'config'),
        models: path.join(backendPath, 'src','models'),
        controllers: path.join(backendPath, 'src','controllers'),
        routes: path.join(backendPath, 'src','routes'),
        middleware: path.join(backendPath, 'src','middleware'),
    };

    if (fs.existsSync(backendPath)) {
        console.log('🗑️  Proyecto backend ya existe, eliminando contenido anterior...');
        try {
            // Eliminar todo el directorio del backend de forma recursiva
            fs.rmSync(backendPath, { recursive: true, force: true });
            console.log('✅ Contenido anterior eliminado exitosamente');
        } catch (error) {
            console.error('❌ Error al eliminar el directorio anterior:', error);
            throw error;
        }
    }

    crearCarpetaSiNoExiste(projectFolderPath);
    crearCarpetaSiNoExiste(backendPath);
    
    console.log('⚙️ Inicializando proyecto con npm...');
    await executeCommand(`npm init -y`, backendPath);

    console.log('⚙️ Modificando package.json...');
    modificarPackageJson(backendPath);

    console.log('📝 Creando tsconfig.json...');
    crearTSConfig(backendPath);
    
    await instalarDependenciasBackend(backendPath, credenciales.dialecto);
    
    crearCarpetaSiNoExiste(srcbackend);
    Object.values(paths).forEach(crearCarpetaSiNoExiste);
    generarIndexRoutes(paths.routes);
    // generarIndexModels(paths.models);
    generarIndexGeneral(srcbackend)
    generarArchivoEnv(credenciales, backendPath);
    generarArchivoConfigDB(backendPath);
    processGraphModel(graphModel, paths.models, paths.routes, paths.controllers, paths.middleware);
};

const crearMiddleware = (middlewarePath: string, userClass?: any): void => {
    const filePath = path.join(middlewarePath, 'checkAuth.ts');

    // Usar la clase de usuario encontrada o usar 'Users' por defecto
    const userClassName = userClass ? userClass.name : 'Users';

    const content = `
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ${userClassName} } from "../models/${userClassName}";

const SECRET_KEY = process.env.JWT_SECRET || "secreto.01";

interface CustomRequest extends Request {
  user?: JwtPayload;
}

const checkAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers["authorization"];
    if (!token) {
      res.status(401).json({ message: "Token no proporcionado" });
      return;
    }
    
    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
    req.user = decoded;
    
    const userFound = await ${userClassName}.findByPk(decoded.id);
    if (!userFound) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }
    
    next();
  } catch (error) {
    res.status(403).json({ message: "Token no válido o expirado" });
    return;
  }
};

export { checkAuth };
`

    fs.writeFileSync(filePath, content);
    console.log(`✅ Archivo de middleware generado: ${filePath}`);
}

const modificarPackageJson = (backendPath: string): void => {
    // Leer el package.json
    const packageJsonPath = path.join(backendPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Agregar los scripts deseados
    packageJson.scripts = {
        ...packageJson.scripts,
        dev: "nodemon --ext ts --exec ts-node src/index.ts",
        build: "tsc",
        start: "node dist/index.js"
    };
    packageJson.type = "commonjs"; // Agregar el tipo de módulo

    // Guardar los cambios en package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

const crearTSConfig = (backendPath: string): void => {
    const tsconfig = {
        "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true
        }
    };
    fs.writeFileSync(path.join(backendPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
}

const mapSequelizeType = (type: string): string => {
    const map: Record<string, string> = {
        string: 'STRING',
        int: 'INTEGER',
        boolean: 'BOOLEAN',
        datetime: 'DATE',
        date: 'DATEONLY',
        time: 'TIME',
        float: 'FLOAT',
        double: 'DOUBLE',
        enum: 'ENUM',
    };
    return map[type.toLowerCase()] || 'STRING';
};

const processGraphModel = (graphModel1: any,modelsPath: string,routesPath: string,controllersPath: string,middlewarePath: string): void => {
    console.log('📌 Procesando nodos...');
    console.log(graphModel1)
    const graphModel = JSON.parse(graphModel1);
    console.log("\n\ngraphModel",graphModel)
    const clases = [];
    for (const node of graphModel.nodeDataArray) {
        console.log(`🔹 Generando modelo: ${node.name}`);
        clases.push(node);
        generarArchivoModelo(node, modelsPath);
        generarControladores(node, controllersPath);
        generarRutas(node, routesPath);
    }
    
    const relacionesporclase:any = [];
    const relacionesaggycomp:any = [];
    console.log('\n🔗 Procesando enlaces:');
    for (const link of graphModel.linkDataArray) {
        // console.log(`   🔗 Relación: ${link.category || 'sin categoría'} (de ${link.from} a ${link.to})`);
        if(!relacionesporclase[link.from]){
            relacionesporclase[link.from] = [];
        }
        const toClass = clases.find((clase) => clase.key == link.to);
        if(toClass){
            relacionesporclase[link.from].push(toClass.name);
        }
        if(link.category == 'aggregation' || link.category == 'composition'){
            if(!relacionesaggycomp[link.from]){
                relacionesaggycomp[link.from] = [];
            }
            if(toClass){
                relacionesaggycomp[link.from].push(toClass.name);
            }
        }
    }
    console.log('Creando relaciones por clase:', relacionesporclase);
    generarIndexModels(modelsPath, relacionesporclase, clases);
    
    // Buscar la clase de usuarios para pasarla al generador de login usando función importada
    const userClass = clases.find((clase: any) => 
        isUserClass(clase.name)
    );
    
    crearMiddleware(middlewarePath, userClass);
    generarLogin(controllersPath, userClass);
    generarRutasAuth(routesPath);
};

const generarRutasAuth = (routesPath: string): void => {
    const filePath = path.join(routesPath, 'auth.ts');
    const content = `
import { Router } from 'express';
import { loginCtrl, registerCtrl, verifyToken } from '../controllers/auth';

const router = Router();

router.post('/login', loginCtrl);
router.post('/register', registerCtrl);
router.get('/verify', verifyToken);

export { router };
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Rutas de autenticación generadas: ${filePath}`);
}

const generarLogin = (controllersPath: string, userClass?: any): void => {
    const filePath = path.join(controllersPath, 'auth.ts');
    
    // Usar la clase de usuario encontrada o usar 'Users' por defecto
    const userClassName = userClass ? userClass.name : 'Users';
    
    // Buscar los nombres de los campos de username y password usando funciones importadas
    let usernameField = 'username';
    let passwordField = 'password';
    let allFields: any[] = [];
    
    if (userClass && userClass.properties) {
        allFields = userClass.properties;
        
        const usernameProperty = findUsernameField(userClass.properties);
        const passwordProperty = findPasswordField(userClass.properties);
        
        if (usernameProperty) usernameField = usernameProperty.name;
        if (passwordProperty) passwordField = passwordProperty.name;
    }
    
    // Generar la destructuración de todos los campos para el registro
    const allFieldNames = allFields.map(field => field.name).join(', ');
    const fieldValidations = allFields
        .filter(field => field.name === usernameField || field.name === passwordField)
        .map(field => `!${field.name}`)
        .join(' || ');
    
    // Generar el objeto para crear el usuario con todos los campos
    const createUserObject = allFields
        .map(field => `            ${field.name}: ${field.name}`)
        .join(',\n');
    
    const content = `
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ${userClassName} } from '../models/${userClassName}';

const SECRET_KEY = process.env.JWT_SECRET || "secreto.01";

// Función de login
const loginCtrl = async (req: Request, res: Response) => {
    try {
        const { ${usernameField}, ${passwordField} } = req.body;
        
        if (!${usernameField} || !${passwordField}) {
            res.status(400).json({ message: "${usernameField} y ${passwordField} son requeridos" });
            return;
        }

        // Buscar usuario por ${usernameField}
        const user = await ${userClassName}.findOne({ 
            where: { ${usernameField}: ${usernameField} } 
        });

        if (!user) {
            res.status(401).json({ message: "Credenciales inválidas" });
            return;
        }

        // Verificar password (en producción deberías usar hash)
        if ((user as any).${passwordField} !== ${passwordField}) {
            res.status(401).json({ message: "Credenciales inválidas" });
            return;
        }

        // Generar JWT token
        const token = jwt.sign(
            { 
                id: (user as any).ID,
                ${usernameField}: (user as any).${usernameField}
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.header('authorization', token)
           .json({ 
                message: "Login exitoso",
                user: {
                    id: (user as any).ID,
                    ${usernameField}: (user as any).${usernameField}
                },
                token: token
            });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error en el proceso de login" });
    }
};

// Función de registro
const registerCtrl = async (req: Request, res: Response) => {
    try {
        const { ${allFieldNames} } = req.body;
        
        // Validar campos obligatorios
        if (${fieldValidations}) {
            res.status(400).json({ message: "${usernameField} y ${passwordField} son requeridos" });
            return;
        }

        // Verificar si el usuario ya existe
        const existingUser = await ${userClassName}.findOne({ 
            where: { ${usernameField}: ${usernameField} } 
        });

        if (existingUser) {
            res.status(409).json({ message: "El usuario ya existe" });
            return;
        }

        // Crear nuevo usuario con todos los campos (en producción deberías hashear la contraseña)
        const newUser = await ${userClassName}.create({
${createUserObject}
        });

        res.status(201).json({ 
            message: "Usuario registrado exitosamente",
            user: {
                id: (newUser as any).ID,
                ${usernameField}: (newUser as any).${usernameField}
            }
        });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ message: "Error en el proceso de registro" });
    }
};

// Función para verificar token
const verifyToken = (req: Request, res: Response) => {
    try {
        const token = req.headers['authorization'];
        
        if (!token) {
            res.status(401).json({ message: "Token no proporcionado" });
            return;
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ 
            message: "Token válido",
            user: decoded
        });
    } catch (error) {
        res.status(403).json({ message: "Token inválido" });
    }
};

export { loginCtrl, registerCtrl, verifyToken };
    `;
    fs.writeFileSync(filePath, content);
    console.log(`✅ Archivo de autenticación generado: ${filePath}`);
}

const generarArchivoModelo = (node: any,modelsPath: string): void => {
    const className = node.name;
    const tableName = className.toLowerCase();
    const filePath = path.join(modelsPath, `${className}.ts`);
    

    const properties = node.properties.map((prop: any) => {
        return `    ${prop.name}: {\n        type: DataTypes.${mapSequelizeType(prop.type)},\n        allowNull: false\n    }`;
    }).join(',\n');

    const content = `
import  { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

class ${className} extends Model {}

${className}.init({
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
${properties},
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: '${tableName}',
    tableName: '${tableName}',
    timestamps: false
});
export { ${className} };
`;

    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Modelo generado: ${filePath}`);
};

const generarControladores = (node: any,controllersPath: string): void => {
    const className = node.name;
    const filePath = path.join(controllersPath, `${className}.ts`);

    const content = `
import { Request, Response } from 'express';
import { ${className} } from '../models/${className}';

const getByID = async (req: Request, res: Response) => {
    try {
        const getByID = await ${className}.findByPk(Number(req.params.id));
        if (!getByID) {
            res.status(404).json({ error: 'No se encontró el registro' });
            return;
        }
        res.json(getByID);
    } catch (error) {
        console.error("Error fetching ${className}:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const getAll = async (req: Request, res: Response) => {
    try {
        const getAll = await ${className}.findAll();
        res.json(getAll);
    } catch (error) {
        console.error("Error fetching ${className}:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const post${className} = async (req: Request, res: Response) => {
    try {
        const post = await ${className}.create(req.body);
        res.status(201).json(post);
    } catch (error) {
        console.error("Error creating ${className}:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const put${className} = async (req: Request, res: Response) => {
    try {
        const put = await ${className}.findByPk(Number(req.params.id));
        if (!put) {
            res.status(404).json({ error: 'No se encontró el registro' });
            return;
        }
        await put.update(req.body);
        res.json(put);
    } catch (error) {
        console.error("Error updating ${className}:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const deleteID = async (req: Request, res: Response) => {
    try {
        const delete${className} = await ${className}.findByPk(Number(req.params.id));
        if (!delete${className}) {
            res.status(404).json({ error: 'No se encontró el registro' });
            return;
        }
        await delete${className}.destroy();
        res.json({ message: 'Registro eliminado' });
    } catch (error) {
        console.error("Error deleting ${className} with ID \${req.params.id}:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export { getByID, getAll, post${className}, put${className}, deleteID };
`
;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Controlador generado: ${filePath}`);
}

const generarRutas = (node: any,routesPath: string): void => {
    const className = node.name;
    const filePath = path.join(routesPath, `${className}.ts`);

    const content = `
import { Router } from 'express';
import { getByID, getAll, post${className}, put${className}, deleteID } from '../controllers/${className}';
import { checkAuth } from '../middleware/checkAuth';

const router = Router();

router.get('',checkAuth,getAll);
router.get('/:id', checkAuth, getByID);
router.post('', checkAuth, post${className});
router.put('/:id', checkAuth, put${className});
router.delete('/:id', checkAuth, deleteID);

export { router };
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Rutas generadas: ${filePath}`);
}

const generarIndexRoutes = (routesPath: string): void => {
    const filePath = path.join(routesPath, 'index.ts');

    const content = `
import { Router } from "express"
import { readdirSync } from "fs";
const PATH_ROUTER = \`\${__dirname}\`
const router = Router()

const cleanFileName = (fileName: String) => {
    const file = fileName.split('.').shift();
    return file;
}
readdirSync(PATH_ROUTER).filter((fileName: String) => {
    const cleanName = cleanFileName(fileName);
    if (cleanName !== "index") {
        import(\`./\${cleanName}\`).then((moduleRouter) => {
            console.log("Ruta agregada: ", cleanName)
            router.use(\`/\${cleanName}\`, moduleRouter.router);
        })
    }
})
export { router };
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Archivo Index de Rutas Generado: ${filePath}`);
}

const generarIndexModels = (modelsPath: string, relacionesporclase: any, clases: any): void => {
    const filePath = path.join(modelsPath, 'index.ts');

    const imports = clases.map((clase: any) => `import { ${clase.name} } from './${clase.name}';`).join('\n');

    // Generar código para relaciones basado en relacionesporclase (agregación y composición)
    let relacionesCode = '';
    
    // Primero procesamos las relaciones de agregación/composición
    console.log('🔄 Procesando relaciones...');
    for (const fromKey in relacionesporclase) {
        const fromClass = clases.find((clase: any) => clase.key == fromKey);
        if (fromClass) {
            for (const toClassName of relacionesporclase[fromKey]) {
                const toClass = clases.find((clase: any) => clase.name == toClassName);
                if (toClass) {
                    // Buscar si existe ya un campo en la clase destino que referencie a la clase origen
                    let foreignKeyName = `ID_${fromClass.name}`;
                    
                    // Si la clase destino tiene propiedades, buscamos si alguna ya está marcada como FK
                    if (toClass.properties) {
                        const existingFk = toClass.properties.find((prop: any) => 
                            prop.isForeignKey === true && 
                            (prop.fromClass === fromClass.name || prop.fromKey === fromClass.key)
                        );
                        
                        if (existingFk) {
                            foreignKeyName = existingFk.name;
                        }
                    }
                    
                    relacionesCode += `\n// Relación entre ${fromClass.name} y ${toClass.name}\n`;
                    relacionesCode += `${fromClass.name}.hasMany(${toClass.name}, { foreignKey: "${foreignKeyName}" });\n`;
                    relacionesCode += `${toClass.name}.belongsTo(${fromClass.name}, { foreignKey: "${foreignKeyName}" });\n`;
                }
            }
        }
    }
    
    const content = `
import { sequelize, ensureDatabaseExists, checkSequelizeConnection } from "../config/database";
${imports}

// Relaciones entre modelos${relacionesCode}

const initializeDb = async () => {
    try {
        await ensureDatabaseExists();
        await checkSequelizeConnection();

        await sequelize.sync({ force: false }) // Cambia a true si quieres reiniciar la base de datos
        .then(() => {
            console.log('Modelos sincronizados correctamente');
        })
        .catch((error) => {
            console.error('Error al sincronizar los modelos:', error);
        });
    } catch (error) {
        console.error('❌ Error durante la inicialización de la base de datos:', error);
    }
}

// Exportar todos los modelos
export {
${clases.map((clase: any) => `    ${clase.name},`).join('\n')}
    initializeDb
};

initializeDb();
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Archivo Index de Modelos Generado: ${filePath}`);
};

const generarIndexGeneral = (backendPath: string): void => {
    const filePath = path.join(backendPath, 'index.ts');

    const content = `
import express from 'express';
import cors from "cors";
import { router } from "./routes";
import "./models"

const app = express();
// process.env.PORT se toma de la variable de entorno (archivo .env), si no existe se toma el puerto 3000 
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*', // Cambia al origen correcto de tu frontend
  exposedHeaders: ['Authorization'] 
}));

app.use(express.json());
app.use(router);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`Servidor corriendo en http://localhost:\${PORT}\`);
});
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Archivo Index General Generado: ${filePath}`);
}

const generarArchivoEnv = (credenciales: Credenciales, backendPath: string): void => {
    const filePath = path.join(backendPath, '.env');
    const dialectMap: Record<string, string> = {
        mysql2: 'mysql',
        pg: 'postgres',
        mssql: 'mssql',
        mariadb: 'mariadb',
        sqlite3: 'sqlite',
    };
    const dialecto = dialectMap[credenciales.dialecto];

    if (!dialecto) {
        throw new Error(`❌ Dialecto "${credenciales.dialecto}" no es compatible.`);
    }

    const content = `
DB_HOST=${credenciales.host}
DB_USER=${credenciales.usuario}
DB_PASSWORD=${credenciales.password}
DB_NAME=${credenciales.nombreDB}
DB_PORT=${credenciales.puertoDB}
DB_DIALECT=${dialecto}
PORT=${credenciales.puertoBackend}
`;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Archivo .env generado: ${filePath}`);
};

const generarArchivoConfigDB = (backendPath: string): void => {
    const filePath = path.join(backendPath, 'src', 'config', 'database.ts');

    const content = `
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

// Carga las variables de entorno
import dotenv from 'dotenv';
dotenv.config();

// Lee variables de entorno
const DB_NAME = process.env.DB_NAME as string;
const DB_USER = process.env.DB_USER as string;
const DB_PASSWORD = process.env.DB_PASSWORD as string;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_DIALECT = process.env.DB_DIALECT as string;

// Verifica que el dialecto sea válido
const allowedDialects = ['mysql', 'postgres', 'mssql', 'mariadb', 'sqlite'];

// Crea la base de datos si no existe
export async function ensureDatabaseExists() {
  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await connection.query(\`CREATE DATABASE IF NOT EXISTS \${DB_NAME}\`);
    console.log(\`📦 Base de datos '\${DB_NAME}' verificada o creada.\`);
    await connection.end();
  } catch (error) {
    console.error('❌ Error verificando o creando la base de datos:', error);
    throw error;
  }
}

// Inicializa Sequelize
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT as any,
  port: DB_PORT,
  timezone: '-07:00',
  dialectOptions: {
    connectTimeout: 10000,
  },
  logging: false,
});

// Prueba la conexión
export async function checkSequelizeConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL (Sequelize) exitosa');
  } catch (error) {
    console.error('❌ Error en la conexión a MySQL (Sequelize):', error);
    throw error;
  }
}
    `;
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Archivo de configuración de base de datos generado: ${filePath}`);
}