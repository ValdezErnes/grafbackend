import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from "../config/mysql"

// Definición de los atributos del usuario
interface CredencialesAttributes {
    ID: number;
    ID_Proyecto: number;
    Host: string;
    Usuario: string;
    Password: string;
    NombreDB: string;
    Dialecto: string;
    PuertoDB: string;
    PuertoBackend: string;
}

// Atributos opcionales para la creación de un usuario
interface CredencialesCreationAttributes extends Optional<CredencialesAttributes, 'ID'> {}

// Definición de la clase de modelo
class Credenciales extends Model<CredencialesAttributes, CredencialesCreationAttributes> implements CredencialesAttributes {
    public ID!: number;
    public ID_Proyecto!:number;
    public Host!:string;
    public Usuario!:string;
    public Password!:string;
    public NombreDB!:string;
    public Dialecto!:string;
    public PuertoDB!:string;
    public PuertoBackend!:string;
}

// Inicialización del modelo
Credenciales.init({
    ID: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    ID_Proyecto: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull:false
    },
    Host: {
        type: DataTypes.STRING,
        allowNull:false
    },
    Usuario: {
        type: DataTypes.STRING,
        allowNull:false
    },
    Password: {
        type: DataTypes.STRING,
        allowNull:false
    },
    NombreDB: {
        type: DataTypes.STRING,
        allowNull:false
    },
    Dialecto: {
        type: DataTypes.STRING,
        allowNull:false
    },
    PuertoDB: {
        type: DataTypes.STRING,
        allowNull:false
    },
    PuertoBackend: {
        type: DataTypes.STRING,
        allowNull:false
    },
}, {
    sequelize,
    tableName: 'Credenciales',
    timestamps: false, 
});

export { Credenciales, CredencialesAttributes };
