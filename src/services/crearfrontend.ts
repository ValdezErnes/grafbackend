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

export const createProjectFrontend = async (nombreProyecto: string, graphModel1: string, puertoBackend:string): Promise<void> => {
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
    generarEnvironment(srcPath,puertoBackend);

    // Buscar la clase de usuarios para generar login/register dinámico
    const userClassNames = ['user', 'users', 'usuario', 'usuarios'];
    const userClass = clases.find((clase: any) => 
        userClassNames.some(className => 
            clase.name && clase.name.toLowerCase().includes(className.toLowerCase())
        )
    );

    generarLogin(componentsPath, userClass);
    generarRegister(componentsPath, userClass);
    generarAuthService(servicesPath, userClass);

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
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

h1 {
  color: #1a237e;
  margin-bottom: 2rem;
  font-size: 2.2rem;
  font-weight: 600;
  position: relative;
  padding-bottom: 0.5rem;
}

h1::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 4px;
  background: linear-gradient(to right, #1a237e, #3949ab);
  border-radius: 2px;
}

.method-selector {
  background: #f5f7fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.method-selector select {
  flex: 1;
  padding: 0.8rem 1rem;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  font-size: 1rem;
  color: #2c3e50;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  max-width: 200px;
}

.method-selector select:hover {
  border-color: #3949ab;
}

.method-selector select:focus {
  border-color: #1a237e;
  box-shadow: 0 0 0 3px rgba(26,35,126,0.1);
}

.execute-btn {
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(26,35,126,0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.execute-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(26,35,126,0.3);
}

.execute-btn:active {
  transform: translateY(0);
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 1.5rem;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
}

.data-table th, .data-table td {
  padding: 1rem 1.5rem;
  text-align: left;
}

.data-table th {
  background: #f8f9fa;
  color: #1a237e;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e0e6ed;
}

.data-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.data-table tr:hover {
  background-color: #f0f4f8;
}

.data-table td {
  color: #2c3e50;
  border-bottom: 1px solid #e0e6ed;
}

.edit-btn, .delete-btn {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  margin: 0 0.3rem;
}

.edit-btn {
  background: #3949ab;
  color: white;
}

.edit-btn:hover {
  background: #1a237e;
  transform: translateY(-1px);
}

.delete-btn {
  background: #ef5350;
  color: white;
}

.delete-btn:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-content h2 {
  color: #1a237e;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
}

.modal-content label {
  display: block;
  margin-bottom: 1.2rem;
  color: #2c3e50;
  font-weight: 500;
}

.modal-content input {
  width: 100%;
  padding: 0.8rem;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.modal-content input:focus {
  border-color: #3949ab;
  box-shadow: 0 0 0 3px rgba(26,35,126,0.1);
  outline: none;
}

.save-btn, .cancel-btn {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  margin-right: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.save-btn {
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: white;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(26,35,126,0.3);
}

.cancel-btn {
  background: #e0e6ed;
  color: #2c3e50;
}

.cancel-btn:hover {
  background: #c4ccd4;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .method-selector {
    flex-direction: column;
    padding: 1rem;
  }

  .method-selector select {
    max-width: 100%;
  }
  
  .data-table {
    display: block;
    overflow-x: auto;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
    padding: 1.5rem;
  }

  .edit-btn, .delete-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.9rem;
  }
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
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token || ''
    });
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`, { headers: this.getHeaders() });
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, { headers: this.getHeaders() });
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(\`\${this.apiUrl}/\${id}\`, data, { headers: this.getHeaders() });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(\`\${this.apiUrl}/\${id}\`, { headers: this.getHeaders() });
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
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: white;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.menu-toggle {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  font-size: 1.2rem;
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-toggle:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-1px);
}

nav {
  display: none;
  margin-top: 1rem;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

nav.open {
  display: block;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding: 0.5rem;
}

.menu-grid a {
  color: white;
  background: rgba(255,255,255,0.1);
  padding: 1rem;
  text-align: center;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
}

.menu-grid a:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  border-color: rgba(255,255,255,0.2);
}

main {
  padding: 2rem;
  background: #f5f7fa;
  min-height: calc(100vh - 80px);
}

@media (max-width: 768px) {
  .menu-grid {
    grid-template-columns: 1fr;
  }

  .menu-toggle {
    width: 100%;
    justify-content: center;
  }

  main {
    padding: 1rem;
  }
}
`;

  fs.writeFileSync(menuHtmlPath, menuHtml.trim());
  fs.writeFileSync(path.join(srcPath, "app.component.ts"), menuComponentTs.trim());
  fs.writeFileSync(path.join(srcPath, "app.component.css"), menuCss.trim());
  console.log(`✅ Menú principal generado en columnas: ${menuHtmlPath}`);
};


const generarRutas = (clases: any[], srcPath: string) => {
    const routesFilePath = path.join(srcPath, "app.routes.ts");

    const imports = [
        ...clases.map(
            (clase) =>
                `import { ${clase.name}Component } from './components/${clase.name.toLowerCase()}/${clase.name.toLowerCase()}.component';`
        ),
        `import { LoginComponent } from './components/login/login.component';`,
        `import { RegisterComponent } from './components/register/register.component';`
    ];

    const routesContent = `
import { Routes } from '@angular/router';

${imports.join("\n")}

export const routes: Routes = [
  ${clases
    .map(
      (clase) =>
        `{ path: '${clase.name.toLowerCase()}', component: ${clase.name}Component }`
    )
    .join(",\n  ")},
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
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

export const generarEnvironment = (srcPath: string,puertoBackend:string) => {
  const envDir = path.join(srcPath, 'environments');
  const envFilePath = path.join(envDir, 'environment.ts');

  // Asegura que exista la carpeta
  if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true });

  const envContent = `
export const environment = {
  BackendPORT: ${puertoBackend || 3000},
  BackendURL: 'http://localhost'
};
  `.trim();

  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ Archivo environment.ts generado en: ${envFilePath}`);
};

const generarLogin = (componentsPath: string, userClass?: any) => {
    const componentPath = path.join(componentsPath, "login");
    crearCarpetaSiNoExiste(componentPath);

    // Buscar los nombres de los campos de username y password
    let usernameField = 'username';
    let passwordField = 'password';
    
    if (userClass && userClass.properties) {
        const usernameProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('username') || 
            prop.name.toLowerCase().includes('usuario') ||
            prop.name.toLowerCase().includes('user')
        );
        const passwordProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('password') || 
            prop.name.toLowerCase().includes('contraseña') ||
            prop.name.toLowerCase().includes('clave')
        );
        
        if (usernameProperty) usernameField = usernameProperty.name;
        if (passwordProperty) passwordField = passwordProperty.name;
    }

    // TypeScript
    const componentTs = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  ${usernameField} = '';
  ${passwordField} = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.${usernameField}, this.${passwordField}).subscribe({
      next: (res: any) => {
        // Guardar token del header o del body
        const token = res.token || res.headers?.get('authorization');
        if (token) {
          sessionStorage.setItem('token', token);
          console.log("Token guardado en sessionStorage:", token);
          this.router.navigate(['/']);
        }
        this.error = '';
      },
      error: (err) => {
        this.error = 'Credenciales inválidas';
        console.error('Error en login:', err);
      }
    });
  }
}
    `;

    // HTML
    const componentHtml = `
<div class="login-container">
  <h2>Iniciar Sesión</h2>
  <form (ngSubmit)="login()">
    <label>${usernameField}:
      <input [(ngModel)]="${usernameField}" name="${usernameField}" required />
    </label>
    <label>${passwordField}:
      <input [(ngModel)]="${passwordField}" name="${passwordField}" type="password" required />
    </label>
    <button type="submit">Entrar</button>
    <div *ngIf="error" class="error">{{error}}</div>
    <p class="register-link">
      ¿No tienes cuenta? <a routerLink="/register">Regístrate aquí</a>
    </p>
  </form>
</div>
    `;

    // CSS
    const componentCss = `
.login-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

h2 {
  text-align: center;
  color: #1a237e;
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.8rem;
  margin-top: 0.3rem;
  border: 2px solid #e0e6ed;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus {
  border-color: #3949ab;
  outline: none;
}

button {
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  margin-top: 1rem;
  cursor: pointer;
  transition: transform 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

.error {
  color: #d32f2f;
  margin-top: 1rem;
  text-align: center;
  padding: 0.5rem;
  background: #ffebee;
  border-radius: 4px;
}

.register-link {
  text-align: center;
  margin-top: 1rem;
  color: #666;
}

.register-link a {
  color: #3949ab;
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}
    `;

    fs.writeFileSync(path.join(componentPath, "login.component.ts"), componentTs.trim());
    fs.writeFileSync(path.join(componentPath, "login.component.html"), componentHtml.trim());
    fs.writeFileSync(path.join(componentPath, "login.component.css"), componentCss.trim());
    console.log(`✅ Componente Login generado: ${componentPath}`);
};

const generarRegister = (componentsPath: string, userClass?: any) => {
    const componentPath = path.join(componentsPath, "register");
    crearCarpetaSiNoExiste(componentPath);

    // Buscar los nombres de los campos
    let usernameField = 'username';
    let passwordField = 'password';
    let allFields: any[] = [];
    
    if (userClass && userClass.properties) {
        allFields = userClass.properties;
        
        const usernameProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('username') || 
            prop.name.toLowerCase().includes('usuario') ||
            prop.name.toLowerCase().includes('user')
        );
        const passwordProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('password') || 
            prop.name.toLowerCase().includes('contraseña') ||
            prop.name.toLowerCase().includes('clave')
        );
        
        if (usernameProperty) usernameField = usernameProperty.name;
        if (passwordProperty) passwordField = passwordProperty.name;
    }

    // Generar variables para todos los campos
    const allFieldsVariables = allFields.map(field => `  ${field.name} = '';`).join('\n');
    const allFieldsParams = allFields.map(field => `this.${field.name}`).join(', ');

    // TypeScript
    const componentTs = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
${allFieldsVariables}
  error = '';
  success = '';

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    // Validar campos obligatorios
    if (!this.${usernameField} || !this.${passwordField}) {
      this.error = 'El ${usernameField} y ${passwordField} son requeridos';
      return;
    }

    const userData = {
${allFields.map(field => `      ${field.name}: this.${field.name}`).join(',\n')}
    };

    this.authService.register(userData).subscribe({
      next: (res) => {
        this.success = 'Usuario registrado correctamente';
        this.error = '';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo registrar el usuario';
        this.success = '';
        console.error('Error en registro:', err);
      }
    });
  }
}
    `;

    // HTML
    const componentHtml = `
<div class="register-container">
  <h2>Registro de Usuario</h2>
  <form (ngSubmit)="register()">
${allFields.map(field => `    <label>${field.name}:
      <input [(ngModel)]="${field.name}" name="${field.name}" ${field.name === passwordField ? 'type="password"' : ''} ${field.name === usernameField || field.name === passwordField ? 'required' : ''} />
    </label>`).join('\n')}
    <button type="submit">Registrar</button>
    <div *ngIf="error" class="error">{{error}}</div>
    <div *ngIf="success" class="success">{{success}}</div>
    <p class="login-link">
      ¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión aquí</a>
    </p>
  </form>
</div>
    `;

    // CSS
    const componentCss = `
.register-container {
  max-width: 450px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

h2 {
  text-align: center;
  color: #1a237e;
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.8rem;
  margin-top: 0.3rem;
  border: 2px solid #e0e6ed;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus {
  border-color: #3949ab;
  outline: none;
}

button {
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  margin-top: 1rem;
  cursor: pointer;
  transition: transform 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

.error {
  color: #d32f2f;
  margin-top: 1rem;
  text-align: center;
  padding: 0.5rem;
  background: #ffebee;
  border-radius: 4px;
}

.success {
  color: #388e3c;
  margin-top: 1rem;
  text-align: center;
  padding: 0.5rem;
  background: #e8f5e8;
  border-radius: 4px;
}

.login-link {
  text-align: center;
  margin-top: 1rem;
  color: #666;
}

.login-link a {
  color: #3949ab;
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}
    `;

    fs.writeFileSync(path.join(componentPath, "register.component.ts"), componentTs.trim());
    fs.writeFileSync(path.join(componentPath, "register.component.html"), componentHtml.trim());
    fs.writeFileSync(path.join(componentPath, "register.component.css"), componentCss.trim());
    console.log(`✅ Componente Register generado: ${componentPath}`);
};

const generarAuthService = (servicesPath: string, userClass?: any) => {
    const serviceFilePath = path.join(servicesPath, "auth.service.ts");
    
    // Buscar los nombres de los campos de username y password
    let usernameField = 'username';
    let passwordField = 'password';
    
    if (userClass && userClass.properties) {
        const usernameProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('username') || 
            prop.name.toLowerCase().includes('usuario') ||
            prop.name.toLowerCase().includes('user')
        );
        const passwordProperty = userClass.properties.find((prop: any) => 
            prop.name.toLowerCase().includes('password') || 
            prop.name.toLowerCase().includes('contraseña') ||
            prop.name.toLowerCase().includes('clave')
        );
        
        if (usernameProperty) usernameField = usernameProperty.name;
        if (passwordProperty) passwordField = passwordProperty.name;
    }
    
    const serviceContent = `
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

const BackendPORT = environment.BackendPORT || 3000;
const BackendURL = environment.BackendURL || "http://localhost";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = \`\${BackendURL}:\${BackendPORT}/auth\`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  login(${usernameField}: string, ${passwordField}: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/login\`, { 
      ${usernameField}, 
      ${passwordField} 
    }, { 
      headers: this.getHeaders(),
      observe: 'response' 
    });
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/register\`, userData, { 
      headers: this.getHeaders() 
    });
  }

  verifyToken(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token || ''
    });
    
    return this.http.get<any>(\`\${this.apiUrl}/verify\`, { headers });
  }

  logout(): void {
    sessionStorage.removeItem('token');
  }
}
    `;
    fs.writeFileSync(serviceFilePath, serviceContent.trim());
    console.log(`✅ Servicio de autenticación generado: ${serviceFilePath}`);
};
