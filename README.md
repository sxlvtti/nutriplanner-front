# NutriPlanner — Frontend

Interfaz web de **NutriPlanner**, proyecto académico de **Programación II — UNSAM**. La aplicación permite configurar un perfil alimentario, explorar recetas precargadas y organizar menús personalizados considerando alergias, ingredientes y categorías de alimentos evitados, y el nivel culinario del usuario.

> **Estado (noviembre de 2026): demo académica funcional.** El frontend está conectado a la API de FastAPI y desplegado en Render. El alcance actual es una demo; no deben considerarse implementadas todas las funcionalidades del MVP proyectado.
>
> NutriPlanner no brinda diagnósticos ni recomendaciones médicas, y no calcula automáticamente el valor nutricional de las recetas.

## Accesos y repositorios

- **Aplicación desplegada:** https://nutriplanner-front.onrender.com
- **Repositorio del backend:** https://github.com/KarenGonzalesCh/nutriplanner-api
- **API FastAPI:** https://nutriplanner-api.onrender.com
- **Documentación de la API (Swagger):** https://nutriplanner-api.onrender.com/docs
- **Requisitos y alcance de la demo:** [docs/requirements.md del backend](https://github.com/KarenGonzalesCh/nutriplanner-api/blob/main/docs/requirements.md) (v3.0)

## Funcionalidades disponibles en la demo

- Registro e inicio de sesión con autenticación JWT provista por el backend.
- Pantalla de verificación de correo electrónico, reenvío del enlace y confirmación mediante token. La obligatoriedad de verificar el correo depende de la configuración del backend.
- Configuración, consulta y actualización del perfil alimentario (alergias, ingredientes, categorías de alimentos evitados y nivel culinario).
- Consulta del catálogo precargado de recetas, sus detalles y su compatibilidad con el perfil.
- Consulta y selección de sustituciones de ingredientes que estén previamente definidas en la API.
- Generación de propuestas de menú de **1 a 7 días**, con elección de tipos de comida: desayuno, almuerzo, merienda y cena.
- Edición provisional de recetas y confirmación de sustituciones antes de guardar un menú.
- Guardado de menús completos, consulta de menús anteriores y eliminación de menús propios.
- Gestión de recetas favoritas y excluidas.

**Límites de la implementación:** el generador del frontend envía actualmente **1 comensal** y tamaño de porción **NORMAL**. La generación crea una propuesta temporal; el guardado es independiente y el backend vuelve a validar las recetas y sustituciones. Los menús históricos pueden consultarse y eliminarse, pero no existe todavía un flujo de reutilización editable completo.

### Funcionalidades pendientes o previstas para el MVP

- Reutilizar un menú histórico como borrador editable, con revalidación.
- Calificar recetas y consultar el promedio de valoraciones.
- Reportar recetas y gestionar los reportes desde funciones de moderación.
- Funciones opcionales como exportación a PDF, recuperación de contraseña y eliminación de cuenta.

El estado funcional detallado y las prioridades se describen en los [requisitos del proyecto](https://github.com/KarenGonzalesCh/nutriplanner-api/blob/main/docs/requirements.md). No se presentan estas funciones como disponibles en la demo.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| React + TypeScript | Componentes e interfaz de usuario |
| TanStack Start / TanStack Router | Aplicación web y rutas |
| Vite | Entorno de desarrollo y compilación |
| Tailwind CSS | Estilos |
| TanStack Query | Proveedor de consultas del árbol de la aplicación |
| Nitro (Node.js) | Ejecución de la compilación para el servidor |
| Vitest | Pruebas automatizadas |
| Render | Despliegue del servicio web del frontend |

## Arquitectura e integración

![Arquitectura general de NutriPlanner](https://raw.githubusercontent.com/KarenGonzalesCh/nutriplanner-api/main/docs/imagenes/arquitectura-nutriplanner.png)

*El diagrama se mantiene en el repositorio del backend y se reutiliza aquí para evitar duplicar la imagen.*

El navegador accede al frontend alojado en Render. El frontend se comunica mediante **HTTP/JSON** con la API **FastAPI**, también alojada en Render. El backend procesa la lógica de negocio, consulta **PostgreSQL en Supabase** mediante SQLAlchemy y utiliza **Resend** para los correos de verificación.

**El frontend no se conecta directamente a PostgreSQL ni necesita credenciales de Supabase o de Resend.** Esas credenciales corresponden al backend.

La URL de la API se configura mediante la variable `VITE_API_URL`. El cliente HTTP está definido en `src/services/api.ts` y, en la versión integrada en `main`, `USE_MOCK = false`: la aplicación utiliza la API real por defecto.

## Estructura principal

| Ruta | Función |
| --- | --- |
| `src/routes/` | Páginas y rutas (acceso, onboarding, perfil, recetas, generador, menús y verificación de correo) |
| `src/services/api.ts` | Cliente HTTP y tipos de solicitudes/respuestas hacia FastAPI |
| `src/lib/app-state.tsx` | Estado compartido de la aplicación y operaciones de sesión (ver estructura del repositorio) |
| `src/components/` | Componentes reutilizables y elementos de interfaz |
| `src/types/` | Definiciones de tipos TypeScript |
| `src/assets/` | Recursos gráficos |
| `src/test/` | Pruebas del frontend |
| `vite.config.ts` | Configuración de compilación y servidor |

## Requisitos para ejecución local

- Git.
- Node.js en una versión compatible con las dependencias del proyecto (preferentemente **LTS**), que incluye npm.
- Backend FastAPI accesible localmente o mediante una URL pública.

### 1. Clonar el repositorio

```powershell
git clone https://github.com/sxlvtti/nutriplanner-front.git
cd nutriplanner-front
```

Si ya tenés el repositorio local, actualizá `main` después de proteger cualquier cambio que tengas sin guardar:

```powershell
git switch main
git pull --ff-only origin main
```

### 2. Instalar dependencias

```powershell
npm ci
```

`npm ci` instala las dependencias según `package-lock.json`. Para actualizar dependencias deliberadamente, se utiliza `npm install`.

### 3. Configurar la dirección de la API

Creá un archivo **`.env.local`** en la raíz del frontend con:

```dotenv
VITE_API_URL=http://localhost:8000
```

Si querés conectarte al backend ya desplegado en Render, utilizá en su lugar:

```dotenv
VITE_API_URL=https://nutriplanner-api.onrender.com
```

La dirección debe apuntar a la API, **sin `/docs` al final**. No coloques contraseñas, claves de base de datos, claves de Resend ni `SECRET_KEY` en variables `VITE_*`, ya que pueden incorporarse al código del navegador.

### 4. Iniciar el frontend

```powershell
npm run dev -- --port 8080
```

Abrí la dirección que muestre la terminal, generalmente `http://localhost:8080` con ese comando. Se indica el puerto `8080` porque el backend actual permite ese origen en su configuración CORS para desarrollo local.

Si elegís otro puerto, verificá que esté permitido en el CORS de FastAPI y que `FRONTEND_URL` del backend corresponda al origen usado cuando esté habilitada la verificación de correo.

Para detener el servidor, presioná `Ctrl + C`.

## Verificación de correo electrónico

El frontend implementa el siguiente recorrido cuando la verificación está habilitada en FastAPI:

1. Registro de una cuenta.
2. Pantalla que indica que el correo está pendiente de confirmación.
3. Posibilidad de solicitar el reenvío del enlace.
4. Apertura de la ruta `/verificar-correo?token=...` desde el enlace recibido.
5. Confirmación del token en la API y regreso al inicio de sesión.

El backend utiliza Resend para enviar el mensaje, administra el vencimiento del token y decide si bloquea el inicio de sesión de cuentas aún no verificadas. **La variable `EMAIL_VERIFICATION_ENABLED` se configura exclusivamente en el backend**, no en este repositorio.

El circuito de registro, enlace de confirmación e inicio de sesión posterior se probó manualmente en el entorno desplegado. Para habilitar el envío a usuarios generales, el proveedor de correo debe tener configurado un remitente autorizado para esos destinatarios.

## Comandos disponibles

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila la aplicación para producción |
| `npm run preview` | Permite previsualizar la compilación |
| `npm run test` | Ejecuta las pruebas con Vitest |
| `npm run test:watch` | Ejecuta pruebas en modo observación |
| `npm run lint` | Ejecuta ESLint |
| `npm run format` | Aplica el formato mediante Prettier |

Para validar localmente antes de abrir un Pull Request:

```powershell
npm run build
npm run test
```

Las pruebas del frontend no sustituyen la verificación de integración completa con la API y PostgreSQL.

## Despliegue en Render

Servicio: [`nutriplanner-front`](https://nutriplanner-front.onrender.com).

Configuración utilizada para el servicio web **Node.js**:

| Parámetro | Valor |
| --- | --- |
| Repositorio | `sxlvtti/nutriplanner-front` |
| Rama de despliegue | `main` |
| Build Command | `npm ci && npm run build` |
| Start Command | `node .output/server/index.mjs` |
| Variable de entorno | `VITE_API_URL=https://nutriplanner-api.onrender.com` |

Render ejecuta una nueva compilación para incorporar cambios de código o variables `VITE_*`. El plan gratuito puede suspender servicios por inactividad, por lo que una primera solicitud puede tardar más en responder.

El backend se despliega por separado como servicio Docker y se conecta a PostgreSQL en Supabase. Las migraciones de base de datos se gestionan en ese repositorio, **no desde el frontend**.

## Documentación relacionada

- [Backend NutriPlanner](https://github.com/KarenGonzalesCh/nutriplanner-api)
- [README del backend](https://github.com/KarenGonzalesCh/nutriplanner-api/blob/main/README.md)
- [Especificación de requisitos v3.0](https://github.com/KarenGonzalesCh/nutriplanner-api/blob/main/docs/requirements.md)
- [Swagger de la API desplegada](https://nutriplanner-api.onrender.com/docs)

---

**Proyecto académico — Programación II, UNSAM.**
