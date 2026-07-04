# Panacea Producción

Frontend de gestión de costos, proveedores, producción y planificación para Panacea, construido con React 19 + Vite. Consume la API en `https://panacea-produccion-backend.vercel.app`.

## Requisitos

- **Node.js 20.19+ o 22.12+** (Vite 8 no arranca con versiones anteriores). Si usás `nvm`:
  ```bash
  nvm install 22
  nvm use 22
  ```
- npm (incluido con Node)

## Configuración inicial

```bash
npm install
cp .env.example .env
```

Variables de entorno (`.env`):

| Variable | Descripción | Valor local recomendado |
|---|---|---|
| `VITE_BACKEND_API_URL` | Base URL del backend. Dejalo **vacío** para usar el proxy de desarrollo de Vite (evita problemas de CORS) | *(vacío)* |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth, si vas a probar el login con Google | *(opcional para desarrollo local)* |

En desarrollo, `vite.config.js` ya redirige `/auth`, `/costos` y `/profile` hacia el backend de producción, así que no hace falta levantar el backend localmente.

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`. La app requiere iniciar sesión (email/contraseña o Google) contra el backend real antes de acceder a cualquier pantalla — no hay modo "sin autenticación".

## Otros comandos

```bash
npm run build    # build de producción en dist/
npm run preview  # sirve el build de dist/ localmente
npm run lint     # ESLint
```

## Notas

- El build de producción (`npm run build` + deploy en Vercel) usa los `rewrites` de `vercel.json` para el mismo proxy `/auth`, `/costos`, `/profile` que en desarrollo.
- El registro de usuarios (`/auth/register`) puede fallar actualmente en el backend; usá una cuenta existente o el login con Google.
