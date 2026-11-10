# NotiU — Asistente Académico y Centralizador de Notificaciones

**NotiU** nace con el propósito de acompañar a los estudiantes universitarios en su vida académica, ofreciendo un espacio intuitivo donde centralizar alertas de plataformas externas (Moodle, Google Classroom, Microsoft Teams, correo), organizar materias y horarios, llevar apuntes/recordatorios, aplicar técnicas de estudio (Pomodoro) y proyectar su avance de calificaciones por cortes.

| Campo | Detalle |
|---|---|
| **Asignatura** | Construcción de Software |
| **Docente** | Diego Andrés Baquero Tibocha |
| **Integrantes** | Alejandro Rodríguez, Alejandro Martínez, David Muñoz, Yorman Sanabria y Jireth Suárez |
| **Versión actual** | `v0.5.0` |
| **Repositorio** | https://github.com/Manum03/NotiU |
| **Colección Postman** | [NotiU-Workspace (Colección oficial compartida)](https://ysanabria188-afk-895689.postman.co/workspace/NotiU-Workspace~ddc04279-c190-4903-8dab-24aeebb6402c/collection/59230493-d05123b7-8411-4172-ab8e-53615029c7c8?action=share&creator=59230493) |

---

## Estructura del repositorio

```
NotiU/
├── backend/                          API REST en Node.js + Express 5 + TypeScript
├── mobile/                           Arquitectura base de la aplicación móvil
└── docs/                             Documentación formal en LaTeX
    ├── documentacion_notiu.tex       Manual técnico, guía UI/UX y notas de versión
    └── terminos_y_condiciones.tex    Términos y condiciones básicos (1 página)
```

---

## Documentación en LaTeX (`docs/`)

Toda la especificación formal del proyecto está redactada en **LaTeX** dentro de la carpeta `docs/`:

- **`docs/documentacion_notiu.tex`**: Documentación unificada con propósito e identidad de marca (simbolismo del zorro y el estilógrafo), hoja de estilos UI/UX (tipografías *Bebas Neue* y *Playfair Display*, paleta oficial de 17 colores HEX), módulos móviles, catálogo de API y notas de versión (`v0.1.0` – `v0.5.0`).
- **`docs/terminos_y_condiciones.tex`**: Versión básica preliminar de **máximo una (1) página** con los términos y condiciones necesarios para la etapa actual de prototipo.

Para compilarlos a PDF localmente (TeX Live / MiKTeX) o en **Overleaf**:

```bash
cd docs
pdflatex documentacion_notiu.tex
pdflatex documentacion_notiu.tex   # segunda pasada para actualizar el índice
pdflatex terminos_y_condiciones.tex
```

---

## Identidad visual y módulos móviles (`mobile/`)

- **Isotipo:** El **zorro** simboliza inteligencia, astucia y adaptación; el trazo central inspirado en la punta de un **estilógrafo** conecta la marca con la escritura, los apuntes y la construcción de ideas.
- **Tipografías:** `Bebas Neue` (logotipo, encabezados y botones CTA) y `Playfair Display` (textos descriptivos).
- **Paleta principal:** Fondo base `#10060A` / `#260A13`, acento primario Carmesí Vívido `#AA0330`, texto cálido `#E9DDD3` y colores semánticos de urgencia (`#EE6520` Alta, `#EEE620` Media, `#20EEDB` Baja, `#BF20EE` Sin fecha).
- **Pantallas diseñadas:**
  1. **Bienvenida, Registro e Inicio de Sesión** (`features/auth`)
  2. **Dashboard de Inicio y Conexiones externas** (calendario, avance semanal y enlace con Correo, Classroom, Universidad/Moodle y Teams)
  3. **Mis Materias** (filtros por estado y prioridad, avance porcentual y detalle de entregas)
  4. **Notas y Recordatorios** (`Mis Apuntes`, creación rápida con prioridad y materia opcional)
  5. **Mi Espacio / Plan de Estudio** (temporizador Pomodoro 25/5 min, categorías de estudio y *"El consejo de tu zorro"*)
  6. **Mi Perfil y Centro de Ayuda** (`features/profile`, datos académicos, seguridad, notificaciones y apariencia)

---

## Backend: API REST (`backend/`)

API REST construida con **Node.js**, **TypeScript** y **Express 5**.

- **Sin base de datos (prototipo actual):** usuarios, sesiones, materias, calificaciones, ajustes, notificaciones, apuntes, conexiones, grupos de estudio y tips se almacenan en arreglos en memoria (se reinician al reiniciar el servidor).
- **Tipado estricto:** modelos de dominio y DTOs de entrada/salida en TypeScript.
- **Validaciones:** campos obligatorios, formato de email, contraseña de mínimo 8 caracteres, rangos de notas (`0.0`–`5.0`), cortes (`1`–`4`) y bloques horarios; errores detallados en `details`.
- **Manejo de errores:** respuestas JSON uniformes con códigos `400`, `401`, `403`, `404`, `409` y `500` (incluyendo JSON mal formado).
- **Seguridad:** contraseñas hasheadas con `scrypt` (`crypto` nativo de Node). Tokens Bearer aleatorios con expiración de 1 hora.

### Cobertura de Endpoints (`v0.5.0`)

Del inventario general de **43 endpoints** diseñados para NotiU (base `http://localhost:3000`), el backend cuenta con **41 endpoints implementados**:

| Módulo | Método | Ruta | Auth | Descripción |
|---|---|---|---|---|
| **Health** | `GET` | `/api/health` | No | Comprueba que el servidor está activo (`{ status: "ok" }`) |
| **Auth** | `POST` | `/api/auth/register` | No | Registra un usuario y devuelve un token (`201`) |
| **Auth** | `POST` | `/api/auth/login` | No | Inicia sesión con email y contraseña, devuelve un token |
| **Auth** | `GET` | `/api/auth/me` | Sí | Devuelve el perfil público del usuario autenticado |
| **Auth** | `PATCH` | `/api/auth/password` | Sí | Cambia la contraseña y cierra las demás sesiones del usuario |
| **Auth** | `POST` | `/api/auth/logout` | Sí | Cierra la sesión actual |
| **Auth** | `GET` | `/api/auth/users` | Sí (`admin`) | Lista los usuarios registrados sin el hash de contraseña |
| **Notificaciones** | `GET` | `/api/notifications` | Sí | Lista alertas paginadas (`MOODLE`, `CLASSROOM`, `SYSTEM`) con `unreadCount` y filtros (`category`, `read`) |
| **Perfil** | `GET` | `/api/profile` | Sí | Obtiene datos académicos (universidad, carrera, semestre, bio, intereses) |
| **Perfil** | `PATCH` | `/api/profile` | Sí | Actualiza parcialmente el perfil del estudiante |
| **Ajustes** | `GET` | `/api/settings` | Sí | Consulta tema (`light`/`dark`/`system`), alertas y privacidad |
| **Ajustes** | `PATCH` | `/api/settings` | Sí | Modifica parcialmente preferencias de tema, alertas o privacidad |
| **Materias** | `POST` | `/api/subjects` | Sí | Crea una materia con créditos, semestre, docente, color y horario |
| **Materias** | `GET` | `/api/subjects` | Sí | Lista materias del usuario con filtros (`semester`, `status`, `search`) |
| **Materias** | `GET` | `/api/subjects/:subjectId` | Sí | Obtiene el detalle de la materia y su resumen de notas |
| **Materias** | `PATCH` | `/api/subjects/:subjectId` | Sí | Actualiza parcialmente los datos u horario de una materia |
| **Materias** | `GET` | `/api/subjects/:subjectId/schedule` | Sí | Devuelve las sesiones semanales de horario de la materia |
| **Materias** | `DELETE` | `/api/subjects/:subjectId` | Sí | Elimina la materia y sus calificaciones vinculadas *(en `main` `v0.5.0`)* |
| **Notas** | `POST` | `/api/subjects/:subjectId/grades` | Sí | Registra una nota (`0.0–5.0`), porcentaje (`1–100`) y corte (`1–4`) *(en `main` `v0.5.0`)* |
| **Notas** | `GET` | `/api/subjects/:subjectId/grades` | Sí | Lista las notas de una materia y su promedio ponderado *(en `main` `v0.5.0`)* |
| **Notas** | `GET` | `/api/subjects/:subjectId/progress` | Sí | Proyecta estado de aprobación y nota necesaria en lo restante *(en `main` `v0.5.0`)* |
| **Notas** | `GET` | `/api/grades` | Sí | Consolidado general de notas filtrable por `semester` y `corte` *(en `main` `v0.5.0`)* |
| **Apuntes** | `GET` | `/api/notes` | Sí | Lista apuntes paginados con filtros (`subjectId`, `tag`, `search`); fijados primero |
| **Apuntes** | `POST` | `/api/notes` | Sí | Crea un apunte (título 1–150) con materia y etiquetas opcionales (`201`) |
| **Apuntes** | `PATCH` | `/api/notes/:noteId` | Sí | Edita título, contenido, materia, etiquetas o fijado; solo el autor (`403`) |
| **Apuntes** | `DELETE` | `/api/notes/:noteId` | Sí | Elimina un apunte propio |
| **Conexiones** | `GET` | `/api/peers` | Sí | Descubre compañeros (`career`, `subjectCode`, `search`) con materias en común; respeta `showProfileToPeers` |
| **Conexiones** | `GET` | `/api/connections` | Sí | Lista conexiones aceptadas y solicitudes pendientes (`status`) |
| **Conexiones** | `POST` | `/api/connections/requests` | Sí | Envía una solicitud de conexión (`201`); sin auto-solicitudes ni duplicados (`409`) |
| **Conexiones** | `PATCH` | `/api/connections/requests/:requestId` | Sí | Acepta o rechaza (`accept`/`reject`) una solicitud recibida pendiente |
| **Conexiones** | `DELETE` | `/api/connections/:connectionId` | Sí | Elimina una conexión o cancela una solicitud enviada |
| **Grupos de estudio** | `GET` | `/api/study-groups` | Sí | Lista grupos con cupos disponibles (`subject`, `search`, `onlyMine`) |
| **Grupos de estudio** | `GET` | `/api/study-groups/:groupId` | Sí | Detalle del grupo con integrantes y roles |
| **Grupos de estudio** | `POST` | `/api/study-groups` | Sí | Crea un grupo (cupo `2–50`); el creador queda como `admin` (`201`) |
| **Grupos de estudio** | `POST` | `/api/study-groups/:groupId/join` | Sí | Se une a un grupo si hay cupo |
| **Grupos de estudio** | `DELETE` | `/api/study-groups/:groupId/leave` | Sí | Sale del grupo; si sale el admin, el rol pasa al miembro más antiguo y el grupo se cierra si queda vacío |
| **Tips** | `GET` | `/api/tips` | Sí | Lista tips de estudio (`tag`, `savedOnly`, `search`, `page`) con bandera `isSaved` |
| **Tips** | `GET` | `/api/tips/tags` | Sí | Catálogo de etiquetas con el conteo de tips |
| **Tips** | `GET` | `/api/tips/:tipId` | Sí | Contenido completo y recursos de un tip |
| **Tips** | `POST` | `/api/tips/:tipId/save` | Sí | Guarda un tip en favoritos (`201`, `409` si ya estaba) |
| **Tips** | `DELETE` | `/api/tips/:tipId/save` | Sí | Quita un tip de favoritos |

Los endpoints protegidos requieren el encabezado:

```
Authorization: Bearer <token>
```

**Usuario de prueba** (se crea automáticamente al iniciar el servidor):

- Email: `admin@notiu.com`
- Contraseña: `admin1234`
- Rol: `admin`

### Estructura del código (`backend/src/`)

```
backend/src/
├── config/env.ts                      Puerto y duración de la sesión
├── models/                            Modelos de dominio y DTOs (auth, profile, settings, subject, grade, notification, note, connection, study-group, tip)
├── utils/                             Validadores, hash scrypt y clase HttpError
├── services/                          Lógica de negocio y almacenamiento en memoria
├── middlewares/                       requireAuth, requireRole, manejo de errores y 404
├── controllers/                       Controladores HTTP por módulo
├── routes/                            Definición de rutas Express
├── app.ts                             Configuración principal de Express
└── server.ts                          Arranque del servidor
```

### Cómo correrlo

Requisitos: **Node.js 18 o superior** y npm.

1. Entrar a la carpeta del backend e instalar las dependencias:

   ```bash
   cd backend
   npm install
   ```

2. Levantar el servidor en modo desarrollo (se recarga solo al guardar cambios):

   ```bash
   npm run dev
   ```

   O compilar y ejecutar la versión de producción:

   ```bash
   npm run build
   npm start
   ```

3. El servidor queda escuchando en `http://localhost:3000`. Para usar otro puerto:

   ```bash
   PORT=4000 npm run dev
   ```

### Probarlo con Postman

Puedes importar o abrir directamente la [colección oficial compartida en Postman](https://ysanabria188-afk-895689.postman.co/workspace/NotiU-Workspace~ddc04279-c190-4903-8dab-24aeebb6402c/collection/59230493-d05123b7-8411-4172-ab8e-53615029c7c8?action=share&creator=59230493), o configurar una colección rápida para autenticación así:

#### 1. Preparar la colección

1. En Postman, crear una colección nueva llamada **NotiU**.
2. En la pestaña **Variables** de la colección, agregar:

   | Variable | Valor |
   |---|---|
   | `baseUrl` | `http://localhost:3000/api/auth` |
   | `token` | (vacío, se llena solo al hacer login) |

3. En la pestaña **Authorization** de la colección, elegir **Bearer Token** y en *Token* poner `{{token}}`. Así todas las peticiones envían el token automáticamente.

#### 2. Crear las peticiones base de Auth

Para las peticiones con body: pestaña **Body** → **raw** → **JSON**.

| # | Nombre | Método | URL | Body (JSON) |
|---|---|---|---|---|
| 1 | Register | POST | `{{baseUrl}}/register` | `{"name": "Ana", "email": "ana@uni.edu", "password": "secreta123"}` |
| 2 | Login | POST | `{{baseUrl}}/login` | `{"email": "ana@uni.edu", "password": "secreta123"}` |
| 3 | Me | GET | `{{baseUrl}}/me` | — |
| 4 | Change password | PATCH | `{{baseUrl}}/password` | `{"currentPassword": "secreta123", "newPassword": "nueva12345"}` |
| 5 | Logout | POST | `{{baseUrl}}/logout` | — |
| 6 | Users (admin) | GET | `{{baseUrl}}/users` | — |

En **Register** y **Login**, pegar este script en la pestaña **Scripts → Post-response** para guardar el token en la variable automáticamente:

```js
const data = pm.response.json();
if (data.token) {
  pm.collectionVariables.set("token", data.token);
}
```

Si no se usa el script, copiar a mano el `token` de la respuesta y pegarlo en la variable `token` de la colección.

#### 3. Orden sugerido para probar

1. **Register** → `201 Created` con el token y los datos del usuario.
2. **Me** → `200 OK` con el perfil de Ana.
3. **Users (admin)** → `403 Forbidden`, porque Ana es `student`.
4. **Change password** → `200 OK`.
5. **Logout** → `200 OK`.
6. **Me** otra vez → `401 Unauthorized` (`Token inválido`), porque la sesión se cerró.
7. **Login** con `admin@notiu.com` / `admin1234` y luego **Users (admin)** → `200 OK` con la lista de usuarios.

#### 4. Probar los errores

- **Register** con el mismo email dos veces → `409 Conflict`.
- **Register** con body `{"email": "x", "password": "123"}` → `400 Bad Request` con la lista de errores en `details`.
- **Login** con una contraseña incorrecta → `401 Unauthorized`.
- **Me** con la autorización en *No Auth* → `401 Unauthorized`.

Ejemplo de respuesta de error:

```json
{
  "error": "Datos inválidos",
  "details": ["email debe ser un correo válido", "password debe tener al menos 8 caracteres"]
}
```

### Limitaciones conocidas

- Los datos se pierden al reiniciar el servidor (no hay base de datos persistente todavía).
- `/api/auth/register` acepta cualquier `role` enviado en el body, incluido `admin`.

---

## Notas de Versión (*Release Notes*)

- **`v0.5.0` (5–7 nov 2026):** Módulo de calificaciones por cortes (`/api/grades`, `/api/subjects/:id/grades`), proyección de nota necesaria para aprobar (`/api/subjects/:id/progress`), eliminación en cascada de materias (`DELETE /api/subjects/:id`) y documentación formal en LaTeX en `docs/` (manual técnico, sistema de diseño UI/UX y términos y condiciones preliminares de 1 página).
- **`v0.4.0` (4–5 nov 2026):** Módulo de materias (`POST/GET/PATCH /api/subjects`) y consulta de horario semanal (`GET /api/subjects/:subjectId/schedule`).
- **`v0.3.0` (4 nov 2026):** Módulos de perfil universitario (`GET/PATCH /api/profile`) y preferencias de usuario (`GET/PATCH /api/settings`).
- **`v0.2.0` (2 nov 2026):** Endpoint paginado de notificaciones (`GET /api/notifications`) con soporte para fuentes `MOODLE`, `CLASSROOM` y `SYSTEM`, y configuración de `.gitignore`.
- **`v0.1.0` (31 oct 2026):** Fundación del monorepo (`backend/`, `mobile/`, `docs/`), servidor Express 5 + TypeScript, hashing `scrypt`, `GET /api/health` y módulo completo de autenticación `/api/auth` (Taller 3).
