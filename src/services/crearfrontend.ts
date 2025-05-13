import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";


export const executeCommand = (command: string, cwd: string) => {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error ejecutando: ${command}\n${stderr}`);
                reject(error);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
};

const crearCarpetaSiNoExiste = (ruta: string) => {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
        console.log(`📁 Carpeta creada: ${ruta}`);
    }
};

export const createProjectFrontend = async (nombreProyecto: string, graphModel1: string): Promise<void> => {
    const desktopPath = path.join(os.homedir(), "Escriotorio");
    const projectFolderPath = path.join(desktopPath, nombreProyecto);
    const frontendPath = path.join(projectFolderPath, `${nombreProyecto}-frontend`);
    const srcPath = path.join(frontendPath, "src", "app");
    const componentsPath = path.join(srcPath, "components");
    const servicesPath = path.join(srcPath, "services");

    const graphModel = JSON.parse(graphModel1);
    const clases = [];
    for (const node of graphModel.nodeDataArray) {
        clases.push(node);
    }

    if (!fs.existsSync(frontendPath)) {
      console.log("🚀 Creando proyecto Angular...");
    await executeCommand(`npx @angular/cli new ${nombreProyecto}-frontend --routing --style css`, projectFolderPath);
    }else{
        console.log("🟡 El proyecto ya existe, continuando...");
    }

    
    crearCarpetaSiNoExiste(componentsPath);
    crearCarpetaSiNoExiste(servicesPath);

    console.log("📝 Generando componentes y servicios...");
    for (const clase of clases) {
        generarComponente(clase, componentsPath);
        generarServicio(clase, servicesPath);
    }

    console.log("📝 Generando menú principal...");
    generarMenuPrincipal(clases, srcPath);

    console.log("📝 Generando rutas...");
    generarRutas(clases, srcPath);

    console.log("📝 Generando configuración de la aplicación...");
    generarAppConfig(srcPath);

    console.log("📝 Generando archivo de entorno...");
    generarEnvironment(srcPath);

    console.log("✅ Proyecto frontend generado correctamente.");
};

const generarComponente = (clase: any, componentsPath: string) => {
  const className = clase.name.toLowerCase();
  const componentPath = path.join(componentsPath, className);

  crearCarpetaSiNoExiste(componentPath);

  // TypeScript del componente
  const componentTs = `
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ${clase.name}Service } from '../../services/${className}.service';

@Component({
  selector: 'app-${className}',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './${className}.component.html',
  styleUrl: './${className}.component.css'
})
export class ${clase.name}Component implements OnInit {
  items: any[] = [];
  selectedMethod: string = '';
  currentItem: any = null;
  formData: any = {};
  showModal: boolean = false;
  isEditing: boolean = false;

  constructor(private ${className}Service: ${clase.name}Service) {}

  ngOnInit(): void {
    this.executeMethod(); // Default action on component load
  }

  executeMethod(): void {
    switch (this.selectedMethod) {
      case 'getAll':
        this.${className}Service.getAll().subscribe(data => this.items = data);
        break;
      case 'getById':
        const id = prompt('Ingrese el ID:');
        if (id) {
          this.${className}Service.getById(Number(id)).subscribe(data => this.items = [data]);
        }
        break;
      case 'create':
        this.formData = {};
        this.isEditing = false;
        this.showModal = true;
        break;
    }
  }

  editItem(item: any): void {
    this.formData = { ...item };
    this.isEditing = true;
    this.showModal = true;
  }

  deleteItem(id: number): void {
    if (confirm('¿Está seguro de eliminar este elemento?')) {
      this.${className}Service.delete(id).subscribe(() => {
        this.items = this.items.filter(item => item.id !== id);
      });
    }
  }

  saveItem(): void {
    if (this.isEditing) {
      this.${className}Service.update(this.formData.ID, this.formData).subscribe(() => {
        this.executeMethod();
        this.showModal = false;
      });
    } else {
      this.${className}Service.create(this.formData).subscribe(newItem => {
        this.items.push(newItem);
        this.showModal = false;
      });
    }
  }

  cancel(): void {
    this.showModal = false;
  }
}
  `;

  // HTML del componente
  const componentHtml = `
<div class="container">
  <h1>${clase.name}</h1>

  <!-- Selector de Método -->
  <div class="method-selector">
    <select [(ngModel)]="selectedMethod">
      <option value="getAll">Obtener todos</option>
      <option value="getById">Obtener por ID</option>
      <option value="create">Crear nuevo</option>
    </select>
    <button class="execute-btn" (click)="executeMethod()">Ejecutar</button>
  </div>

  <!-- Tabla de Datos -->
  <table *ngIf="items.length" class="data-table">
    <thead>
      <tr>
        <th>ID</th>
        ${clase.properties.map((attr: { name: any; }) => `<th>${attr.name}</th>`).join('')}
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let item of items">
        <td>{{item.ID}}</td>
        ${clase.properties.map((attr: { name: any; }) => `<td>{{item.${attr.name}}}</td>`).join('')}
        <td>
          <button class="edit-btn" (click)="editItem(item)">Editar</button>
          <button class="delete-btn" (click)="deleteItem(item.ID)">Eliminar</button>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Modal de Creación/Edición -->
  <div *ngIf="showModal" class="modal">
    <div class="modal-content">
      <h2>{{ isEditing ? 'Editar' : 'Crear' }} ${clase.name}</h2>
      ${clase.properties.map((attr: { name: any; }) => `
      <label>${attr.name}: 
        <input [(ngModel)]="formData.${attr.name}" placeholder="Ingrese ${attr.name}" />
      </label>`).join('<br/>')}
      <br/>
      <button class="save-btn" (click)="saveItem()">Guardar</button>
      <button class="cancel-btn" (click)="cancel()">Cancelar</button>
    </div>
  </div>
</div>
  `;

  // CSS del componente
  const componentCss = `
.container {
  padding: 20px;
}
.method-selector {
  margin-bottom: 20px;
}
.execute-btn {
  background-color: #3498db;
  color: white;
  padding: 10px;
  border: none;
  cursor: pointer;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
.data-table th, .data-table td {
  padding: 10px;
  text-align: center;
  border: 1px solid #ccc;
}
.data-table th {
  background-color: #f4f4f4;
}
.edit-btn, .delete-btn {
  padding: 5px 10px;
  border: none;
  cursor: pointer;
}
.edit-btn {
  background-color: #f39c12;
  color: white;
}
.delete-btn {
  background-color: #e74c3c;
  color: white;
}
.modal {
  position: fixed;
  top: 20%;
  left: 30%;
  width: 40%;
  padding: 20px;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 10;
}
.modal-content {
  padding: 20px;
}
.save-btn {
  background-color: #27ae60;
  color: white;
  padding: 10px;
  border: none;
  cursor: pointer;
}
.cancel-btn {
  background-color: #bdc3c7;
  color: white;
  padding: 10px;
  border: none;
  cursor: pointer;
}
  `;

  // Escribir los archivos generados
  fs.writeFileSync(path.join(componentPath, `${className}.component.ts`), componentTs.trim());
  fs.writeFileSync(path.join(componentPath, `${className}.component.html`), componentHtml.trim());
  fs.writeFileSync(path.join(componentPath, `${className}.component.css`), componentCss.trim());

  console.log(`✅ Componente generado: ${componentPath}`);
};



const generarServicio = (clase: any, servicesPath: string) => {
    const className = clase.name.toLowerCase();
    const serviceFilePath = path.join(servicesPath, `${className}.service.ts`);

    const serviceContent = `
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

const BackendPORT = environment.BackendPORT ||  3000;
const BackendURL = environment.BackendURL || "http://localhost";


@Injectable({
  providedIn: 'root'
})
export class ${clase.name}Service {
  private apiUrl = \`\${BackendURL}:\${BackendPORT}/${className}\`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(\`\${this.apiUrl}/\${id}\`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(\`\${this.apiUrl}/\${id}\`);
  }
}
    `;

    fs.writeFileSync(serviceFilePath, serviceContent.trim());
    console.log(`✅ Servicio generado: ${serviceFilePath}`);
};

const generarMenuPrincipal = (clases: any[], srcPath: string) => {
  const menuHtmlPath = path.join(srcPath, "app.component.html");
  const menuHtml = `
<header>
  <button class="menu-toggle" (click)="toggleMenu()">☰ Clases</button>
  <nav [class.open]="menuOpen">
    <div class="menu-grid">
      ${clases
        .map(
          (clase) => `
        <a [routerLink]="'/${clase.name.toLowerCase()}'" (click)="autoCloseMenu()">
          ${clase.name}
        </a>`
        )
        .join("\n")}
    </div>
  </nav>
</header>

<main>
  <router-outlet></router-outlet>
</main>
`;

  const menuComponentTs = `
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  menuOpen = true;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  autoCloseMenu() {
    this.menuOpen = false;
  }
}
`;

  const menuCss = `
header {
  background: #2c3e50;
  color: white;
  padding: 10px;
}
.menu-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  margin-bottom: 10px;
}
nav {
  display: none;
}
nav.open {
  display: block;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  padding: 10px;
}
.menu-grid a {
  color: white;
  background-color: #34495e;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.2s ease;
}
.menu-grid a:hover {
  background-color: #3d566e;
}
main {
  padding: 20px;
}
`;

  fs.writeFileSync(menuHtmlPath, menuHtml.trim());
  fs.writeFileSync(path.join(srcPath, "app.component.ts"), menuComponentTs.trim());
  fs.writeFileSync(path.join(srcPath, "app.component.css"), menuCss.trim());
  console.log(`✅ Menú principal generado en columnas: ${menuHtmlPath}`);
};


const generarRutas = (clases: any[], srcPath: string) => {
    const routesFilePath = path.join(srcPath, "app.routes.ts");

    const routesContent = `
import { Routes } from '@angular/router';

${clases
        .map(
            (clase) =>
                `import { ${clase.name}Component } from './components/${clase.name.toLowerCase()}/${clase.name.toLowerCase()}.component';`
        )
        .join("\n")}

export const routes: Routes = [
  ${clases
        .map(
            (clase) =>
                `{ path: '${clase.name.toLowerCase()}', component: ${clase.name}Component }`
        )
        .join(",\n  ")}
];
    `;

    fs.writeFileSync(routesFilePath, routesContent.trim());
    console.log(`✅ Rutas generadas: ${routesFilePath}`);
};
const generarAppConfig = (srcPath: string) => {
  const configPath = path.join(srcPath, "app.config.ts");

  const configContent = `
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
providers: [
  provideRouter(routes),
  provideHttpClient(),
]
};
  `;

  fs.writeFileSync(configPath, configContent.trim());
  console.log(`✅ Configuración generada: ${configPath}`);
};

export const generarEnvironment = (srcPath: string) => {
  const envDir = path.join(srcPath, 'environments');
  const envFilePath = path.join(envDir, 'environment.ts');

  // Asegura que exista la carpeta
  if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true });

  const envContent = `
export const environment = {
  BackendPORT: 3000,
  BackendURL: 'http://localhost'
};
  `.trim();

  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ Archivo environment.ts generado en: ${envFilePath}`);
};