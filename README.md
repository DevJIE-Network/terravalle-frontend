# TerraValle — Frontend

Plataforma web progresiva (PWA) de bienes raíces que permite publicar inmuebles mediante **fichas técnicas estandarizadas** y obtener una **estimación orientativa de precio asistida por IA**.

> Proyecto académico de la materia **Programación de Aplicaciones Web Progresivas** — Universidad Tecnológica de Tula-Tepeji (UTTT).

Este repositorio contiene la interfaz de usuario. Se comunica con la API REST (JWT) del repositorio [terravalle-backend](https://github.com/DevJIE-Network/terravalle-backend).

---

## Tecnologías

| Herramienta                                                    | Uso                            |
| -------------------------------------------------------------- | ------------------------------ |
| [Vite](https://vite.dev) + [React 19](https://react.dev)       | Base del proyecto (JavaScript) |
| [React Router](https://reactrouter.com)                        | Navegación y rutas protegidas  |
| [Tailwind CSS v4](https://tailwindcss.com)                     | Estilos (mobile-first)         |
| [Axios](https://axios-http.com)                                | Cliente HTTP hacia el backend  |
| [ESLint](https://eslint.org) + [Prettier](https://prettier.io) | Calidad y formato del código   |

## Requisitos

- **Node.js 20.19+ o 22.12+** (recomendado: la versión LTS más reciente). Verifica con `node -v`.
- **npm 10+** (viene con Node).
- Recomendado: VS Code con las extensiones sugeridas por el proyecto (ESLint, Prettier y Tailwind CSS IntelliSense). VS Code te las ofrecerá al abrir la carpeta.

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/DevJIE-Network/terravalle-frontend.git
cd terravalle-frontend

# 2. Cambiarte a sprint1 actualizado y crear tu rama personal (ver "Flujo de ramas")
git checkout sprint1
git pull origin sprint1
git checkout -b sprint1-TuNombre

# 3. Instalar dependencias
npm install

# 4. Crear tu archivo .env a partir del ejemplo
#    PowerShell:
Copy-Item .env.example .env
#    Git Bash / macOS / Linux:
cp .env.example .env

# 5. Levantar el servidor de desarrollo
npm run dev
```

Abre <http://localhost:5173>.

### Variables de entorno

| Variable       | Descripción                  | Valor por defecto           |
| -------------- | ---------------------------- | --------------------------- |
| `VITE_API_URL` | URL base de la API (backend) | `http://localhost:3000/api` |

> El archivo `.env` **no se sube** al repositorio (está en `.gitignore`). Si agregas una variable nueva, agrégala también a `.env.example`. En Vite, solo las variables que empiezan con `VITE_` llegan al navegador.

## Comandos

| Comando                | Qué hace                                           |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con recarga automática      |
| `npm run build`        | Genera la versión de producción en `dist/`         |
| `npm run preview`      | Sirve localmente el build de `dist/` para probarlo |
| `npm run lint`         | Revisa el código con ESLint                        |
| `npm run format`       | Formatea todo el código con Prettier               |
| `npm run format:check` | Verifica el formato sin modificar archivos         |

> Antes de cada commit ejecuta `npm run format` y `npm run lint`. El PR no debe tener errores de lint ni de build.

## Estructura de carpetas

```
src/
├── api/                    # Comunicación con el backend
│   ├── client.js           # Instancia de Axios (token JWT + mensajes de error en español)
│   ├── auth.service.js     # Servicio de ejemplo: register(), login()
│   └── index.js
├── components/
│   ├── layout/             # Header, Navbar, Footer, MainLayout (estructura de todas las páginas)
│   ├── ui/                 # Componentes reutilizables: Button, Input, Alert, Card, Loader,
│   │                       #   EmptyState, ErrorState, PageHeader
│   └── dev/                # Herramientas solo para desarrollo (botón visitante/autenticado)
├── context/                # AuthContext + AuthProvider (sesión global)
├── hooks/                  # Hooks personalizados (useAuth)
├── pages/                  # Una carpeta por pantalla (HomePage, CatalogPage, LoginPage...)
├── routes/                 # AppRouter (mapa de rutas), ProtectedRoute, GuestRoute
├── utils/                  # Constantes (ROUTES, menú...) y helpers (cn, formatPrice)
├── App.jsx                 # Monta los proveedores y el router
├── main.jsx                # Punto de entrada
└── index.css               # Tailwind + paleta de colores (@theme)
```

### Rutas

| Ruta               | Acceso          | Página             | Historia que la completa |
| ------------------ | --------------- | ------------------ | ------------------------ |
| `/`                | Pública         | `HomePage`         | Por asignar              |
| `/catalogo`        | Pública         | `CatalogPage`      | HU-026, HU-027, HU-028   |
| `/login`           | Solo visitantes | `LoginPage`        | HU-018                   |
| `/registro`        | Solo visitantes | `RegisterPage`     | HU-017                   |
| `/mis-propiedades` | Protegida       | `MyPropertiesPage` | HU-024 (y HU-020 a 025)  |
| `/favoritos`       | Protegida       | `FavoritesPage`    | HU-030                   |
| `/perfil`          | Protegida       | `ProfilePage`      | HU-019                   |
| `/404` y `*`       | Pública         | `NotFoundPage`     | HU-016 ✔                 |

- **Protegida:** sin sesión redirige a `/login`.
- **Solo visitantes:** con sesión iniciada redirige a `/`.

## ¿Dónde trabajo?

| Si vas a crear...                     | Va en...                                                          | Ejemplo                                           |
| ------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Una pantalla nueva                    | `src/pages/<Nombre>/<Nombre>Page.jsx`                             | `src/pages/PropertyDetail/PropertyDetailPage.jsx` |
| Componentes que solo usa una pantalla | La misma carpeta de la pantalla                                   | `src/pages/Catalog/FiltersPanel.jsx`              |
| Un componente reutilizable genérico   | `src/components/ui/` (y exportarlo en `index.js`)                 | `Modal.jsx`, `Badge.jsx`                          |
| Llamadas al backend                   | `src/api/<modulo>.service.js`                                     | `properties.service.js`                           |
| Un hook personalizado                 | `src/hooks/` (y exportarlo en `index.js`)                         | `useFavorites.js`                                 |
| Constantes o funciones auxiliares     | `src/utils/`                                                      | `ROUTES`, `formatPrice()`                         |
| Una ruta nueva                        | `ROUTES` en `src/utils/constants.js` + `src/routes/AppRouter.jsx` | —                                                 |
| Una opción del menú                   | `GUEST_NAV_LINKS` / `AUTH_NAV_LINKS` en `src/utils/constants.js`  | —                                                 |
| Colores del tema                      | Bloque `@theme` en `src/index.css`                                | `--color-primary-600`                             |

**Para empezar tu pantalla:** abre la página que te toca en `src/pages/`; el comentario `// TODO HU-0XX` de arriba indica qué historia la completa. Reemplaza el `EmptyState` de ejemplo por tu implementación. `MainLayout` ya pone el encabezado, el pie y los márgenes, así que tu página solo necesita su contenido.

### Importaciones con `@`

`@` apunta a `src/`, así evitas rutas como `../../../`:

```jsx
import { Button, Input, Alert } from '@/components/ui';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/utils/constants';
```

### Componentes UI

Todos tienen sus props documentadas con JSDoc (pasa el cursor sobre el componente en VS Code para verlas).

```jsx
import { Alert, Button, Card, EmptyState, ErrorState, Input, Loader, PageHeader } from '@/components/ui';

<PageHeader title="Mis propiedades" description="Administra tus inmuebles." />

<Button onClick={guardar}>Guardar</Button>
<Button variant="secondary" to={ROUTES.CATALOG}>Ver catálogo</Button>   {/* como enlace */}
<Button variant="danger" loading={eliminando}>Eliminar</Button>

<Input label="Correo electrónico" type="email" name="email"
       value={email} onChange={(e) => setEmail(e.target.value)} error={errores.email} />

<Alert variant="success" onClose={() => setAviso(null)}>Cambios guardados.</Alert>

<Card title="Casa en Tula" footer={<Button size="sm">Ver detalle</Button>}>3 recámaras</Card>

<Loader label="Cargando propiedades..." />
<EmptyState title="Sin resultados" description="Prueba con otros filtros." />
<ErrorState message={error.message} onRetry={cargar} />
```

| Componente   | Props principales                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `Button`     | `variant` (primary · secondary · danger), `size`, `loading`, `disabled`, `fullWidth`, `type`, `to` |
| `Input`      | `label`, `type` (text · email · password · number...), `error`, `hint`                             |
| `Alert`      | `variant` (success · error · warning · info), `title`, `onClose`                                   |
| `Card`       | `title`, `footer`                                                                                  |
| `Loader`     | `size`, `label`, `hideLabel`                                                                       |
| `EmptyState` | `title`, `description`, `icon`, `action`                                                           |
| `ErrorState` | `message`, `onRetry`, `retrying`, `title`                                                          |
| `PageHeader` | `title`, `description`, `actions`                                                                  |

### Cliente HTTP

1. Crea (o usa) un servicio en `src/api/` con funciones que llamen a `client`:

   ```js
   // src/api/properties.service.js
   import client from './client';

   export async function getProperties(params) {
     const { data } = await client.get('/properties', { params });
     return data;
   }
   ```

2. Úsalo en tu página con el patrón carga / error / datos:

   ```jsx
   const [status, setStatus] = useState('loading');
   const [error, setError] = useState(null);

   const cargar = async () => {
     setStatus('loading');
     try {
       setProperties(await getProperties());
       setStatus('success');
     } catch (err) {
       setError(err); // err.message ya viene en español
       setStatus('error');
     }
   };

   if (status === 'loading') return <Loader />;
   if (status === 'error') return <ErrorState message={error.message} onRetry={cargar} />;
   ```

   Hay un ejemplo funcionando en `src/pages/Catalog/CatalogPage.jsx`.

**Qué hace el cliente por ti:**

- Agrega el header `Authorization: Bearer <token>` si hay sesión.
- Convierte los errores en mensajes claros en español (sin conexión, tiempo agotado, 400, 401, 403, 404, 500). En el `catch` tienes `error.message`, `error.status` y `error.details` (respuesta del backend, útil para errores de validación).
- Ante un **401** cierra la sesión automáticamente.

### Sesión (`useAuth`)

```jsx
const { user, token, isAuthenticated, login, logout } = useAuth();
```

⚠ **El login es simulado** mientras el backend termina `POST /auth/login`. Credenciales de prueba: `demo@terravalle.mx` / `demo1234`. La sesión se guarda en `localStorage`. Los puntos a conectar con la API están marcados con `// TODO: conectar con POST /auth/login` en `src/context/AuthProvider.jsx`.

**Botón DEV:** con `npm run dev` aparece abajo a la derecha un botón para alternar entre visitante y usuario autenticado y probar el menú y las rutas protegidas. No se incluye en el build de producción.

## Flujo de ramas

```
main ← release ← developer ← sprint1 ← sprint1-Eduardo
                                      ← sprint1-Isai
                                      ← sprint1-Joel
```

- `main`: versión estable. `release`: preparación de entregas. `developer`: integración entre sprints. `sprint1`: integración del sprint en curso.
- **Cada integrante trabaja solo en su rama personal**, creada desde `sprint1` actualizado.
- **Nunca** hagas push directo a `sprint1`, `developer`, `release` ni `main`: los cambios se integran mediante **Pull Request** hacia `sprint1`.

Día a día:

```bash
# Traer lo último de sprint1 a tu rama antes de empezar
git checkout sprint1-TuNombre
git pull origin sprint1

# Trabajar, revisar y subir
npm run format
npm run lint
git add .
git commit -m "feat(SCRUM-31): formulario de registro de cuenta"
git push origin sprint1-TuNombre
```

Después abre un Pull Request en GitHub de `sprint1-TuNombre` → `sprint1`.

## Convención de commits

Formato: `tipo(CLAVE-JIRA): descripción breve en minúsculas`

| Tipo       | Cuándo usarlo                                        |
| ---------- | ---------------------------------------------------- |
| `feat`     | Nueva funcionalidad                                  |
| `fix`      | Corrección de un error                               |
| `style`    | Cambios visuales o de formato sin lógica nueva       |
| `refactor` | Reorganizar código sin cambiar su comportamiento     |
| `docs`     | Documentación                                        |
| `chore`    | Configuración, dependencias, tareas de mantenimiento |

Ejemplos:

```
feat(SCRUM-30): navbar con menú condicional
fix(SCRUM-32): redirección tras iniciar sesión
docs(SCRUM-30): actualizar README
```

## Metodología

El proyecto se gestiona con **Scrum** en Jira, organizado en sprints semanales.

## Equipo

- Eduardo Olvera Camacho
- Joel Álvarez Rodríguez
- Isai Axel Hernández Paniagua Francisco

**Asesor:** Juan Carlos Benítez Reyes

## Licencia

Proyecto de uso académico — UTTT, 2026.
