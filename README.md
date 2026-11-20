# NotiU — Asistente Académico y Centralizador de Notificaciones

**NotiU** nace con el propósito de acompañar a los estudiantes universitarios en su vida académica, ofreciendo un espacio intuitivo donde centralizar alertas de plataformas externas (Moodle, Google Classroom, Microsoft Teams, correo), organizar materias y horarios, llevar apuntes/recordatorios, aplicar técnicas de estudio (Pomodoro) y proyectar su avance de calificaciones por cortes.

| Campo | Detalle |
|---|---|
| **Asignatura** | Construcción de Software |
| **Docente** | Diego Andrés Baquero Tibocha |
| **Integrantes** | Alejandro Rodríguez, Alejandro Martínez, David Muñoz, Yorman Sanabria y Jireth Suárez |
| **Versión actual** | `v0.7.0` |
| **Repositorio** | https://github.com/Manum03/NotiU |
| **Colección Postman** | [NotiU-Workspace (Colección oficial compartida)](https://ysanabria188-afk-895689.postman.co/workspace/NotiU-Workspace~ddc04279-c190-4903-8dab-24aeebb6402c/collection/59230493-d05123b7-8411-4172-ab8e-53615029c7c8?action=share&creator=59230493) |

---

## Estructura del repositorio

```
NotiU/
├── backend/                          API REST en Node.js + Express 5 + TypeScript + Firebase
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

## App móvil: cómo correrla (`mobile/`)

La app usa **Firebase Authentication** (SDK web de Firebase, funciona en **Expo Go**) y se comunica con el backend enviando el ID token de Firebase.

1. En la consola de Firebase, en *Configuración del proyecto → Tus apps*, registra una **app web** (`</>`) y copia su configuración.
2. Copia `mobile/.env.example` como `mobile/.env` y llena los valores. En `EXPO_PUBLIC_API_URL` pon la IP de tu computador en la red Wi-Fi (no `localhost`).
3. Instala y arranca:

   ```bash
   cd mobile
   npm install
   npx expo start      # escanea el QR con Expo Go
   ```

Ya funciona con el backend: registro, inicio de sesión (la sesión queda guardada), recuperación de contraseña, cierre de sesión (desde el avatar), Inicio, Materias, Nueva tarea/recordatorio/nota, Recordatorios (completar, subtareas, archivar, restaurar y eliminar) y **conectar Moodle** (tarjeta *Universidad / Plataforma* del Inicio).

También están Notificaciones, Perfil (con los tiempos de recordatorio), Detalle de tarea, Conexiones, inicio de sesión con Google, conexión con Classroom y notificaciones push. Estas tres últimas requieren *development build* (sección siguiente). Lo que falta está en [Próximos pasos](#próximos-pasos).

### Development build (push, Google Sign-In y Classroom)

Las notificaciones push y los módulos nativos (Google Sign-In) **no funcionan en Expo Go** (desde el SDK 53 Expo Go no recibe push en Android). Hay que instalar una *development build* una vez; después se sigue trabajando con `npx expo start` como siempre.

1. En Firebase registra también una **app Android** con el paquete `co.edu.notiu` (y una app iOS con el bundle `co.edu.notiu` si se va a compilar para iPhone). Descarga `google-services.json` (y `GoogleService-Info.plist`) y ponlos en `mobile/`. **No se suben a git** (están en `.gitignore`); `mobile/.easignore` permite que EAS sí los lea del disco al compilar.
2. Para Google Sign-In en Android, agrega a la app Android de Firebase la huella **SHA-1** del certificado de la build (`npx eas-cli@latest credentials` → Android → *Keystore* la muestra) y vuelve a descargar `google-services.json`.
3. Crea el proyecto de EAS y compila:

   ```bash
   cd mobile
   npx eas-cli@latest login
   npx eas-cli@latest init                      # agrega extra.eas.projectId a app.json (lo usa el push)
   npx eas-cli@latest build --profile development --platform android
   ```

4. Instala el APK que entrega EAS en el celular y arranca el servidor de desarrollo con `npx expo start` (la app abre el servidor con el QR o la lista de servidores cercanos).
5. **Credenciales de push (FCM V1):** Consola de Firebase → *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*. Luego `npx eas-cli@latest credentials` → Android → *Google Service Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* → *Upload a new service account key*. Ese JSON tampoco se sube a git. Guía: https://docs.expo.dev/push-notifications/fcm-credentials/

Las variables `EXPO_PUBLIC_*` de `mobile/.env` las lee Metro en tu computador, así que sirven para la development build. Para builds `preview` o `production` (sin Metro) hay que crearlas en EAS: `npx eas-cli@latest env:create`.

---

## Backend: API REST (`backend/`)

API REST construida con **Node.js**, **TypeScript** y **Express 5**, con **Firebase Authentication** y **Cloud Firestore**.

- **Autenticación con Firebase:** la app móvil registra e inicia sesión con el SDK de Firebase Auth (correo/contraseña o Google). Cada petición envía el **ID token** de Firebase y el backend lo verifica con Firebase Admin. Las contraseñas nunca pasan por el backend. El rol `admin` se asigna con la variable `ADMIN_EMAILS` (ya no se puede enviar `role` desde el cliente).
- **Base de datos:** usuarios, ajustes, tareas, notificaciones, integraciones, dispositivos y recordatorios viven en **Firestore**. Las tareas importadas de Moodle/Classroom y las creadas por el estudiante comparten el mismo modelo (`source`: `MANUAL`, `MOODLE`, `CLASSROOM`). Todos los módulos están en Firestore: perfiles (`profiles/{uid}`), materias, calificaciones y tips guardados en subcolecciones de `users/{uid}`, apuntes (`notes`), conexiones (`connections`, con `participants`), grupos de estudio (`studyGroups`, con `memberIds`) y el catálogo de tips (`tips`, que se siembra al arrancar si está vacío). Solo se usan consultas de un campo, así que no hacen falta índices compuestos.
- **Integraciones:**
  - **Moodle** mediante el enlace privado de *Exportar calendario* (iCal). No requiere la contraseña del estudiante.
  - **Google Classroom** con OAuth de solo lectura (`classroom.courses.readonly`, `classroom.coursework.me.readonly`) y consulta periódica.
- **Notificaciones:** al detectar una tarea nueva o un cambio de fecha se guarda la notificación y se envía un **push con Expo**. Los recordatorios se programan por defecto 24 h y 2 h antes de la entrega (configurable en ajustes).
- **Jobs:** cada `SYNC_INTERVAL_MINUTES` (30 por defecto) se sincronizan todas las integraciones; cada minuto se envían los recordatorios pendientes.
- **Seguridad:** los secretos (enlace iCal y refresh token de Google) se guardan **cifrados con AES-256-GCM**. Las URLs que escribe el usuario se validan para que no apunten a redes internas. Las reglas de Firestore bloquean todo acceso directo desde clientes.
- **Validaciones y errores:** se mantienen los mismos formatos de antes (`400` con `details`, `401`, `403`, `404`, `409`, `429`, `500`).

### Cobertura de Endpoints (`v0.7.0`)

Base `http://localhost:3000`.

| Módulo | Método | Ruta | Auth | Descripción |
|---|---|---|---|---|
| **Health** | `GET` | `/api/health` | No | Comprueba que el servidor está activo (`{ status: "ok" }`) |
| **Auth** | `GET` | `/api/auth/me` | Sí | Devuelve el usuario autenticado (lo crea en Firestore la primera vez) |
| **Auth** | `GET` | `/api/auth/users` | Sí (`admin`) | Lista los usuarios registrados sin el hash de contraseña |
| **Notificaciones** | `GET` | `/api/notifications` | Sí | Lista alertas paginadas (`MOODLE`, `CLASSROOM`, `SYSTEM`) con `unreadCount`, `kind`, `taskId` y filtros (`category`, `read`) |
| **Notificaciones** | `PATCH` | `/api/notifications/:notificationId/read` | Sí | Marca una notificación como leída |
| **Notificaciones** | `POST` | `/api/notifications/read-all` | Sí | Marca todas como leídas |
| **Notificaciones** | `POST` | `/api/notifications/test` | Sí | Envía un push de prueba a los dispositivos del usuario |
| **Perfil** | `GET` | `/api/profile` | Sí | Obtiene datos académicos (universidad, carrera, semestre, bio, intereses) |
| **Perfil** | `PATCH` | `/api/profile` | Sí | Actualiza parcialmente el perfil del estudiante |
| **Ajustes** | `GET` | `/api/settings` | Sí | Consulta tema, alertas, tiempos de recordatorio (`reminders.offsetsMinutes`) y privacidad |
| **Ajustes** | `PATCH` | `/api/settings` | Sí | Modifica parcialmente preferencias de tema, alertas o privacidad |
| **Materias** | `POST` | `/api/subjects` | Sí | Crea una materia con créditos, semestre, docente, color y horario |
| **Materias** | `GET` | `/api/subjects` | Sí | Lista materias del usuario con filtros (`semester`, `status`, `search`) |
| **Materias** | `GET` | `/api/subjects/:subjectId` | Sí | Obtiene el detalle de la materia y su resumen de notas |
| **Materias** | `PATCH` | `/api/subjects/:subjectId` | Sí | Actualiza parcialmente los datos u horario de una materia |
| **Materias** | `GET` | `/api/subjects/:subjectId/schedule` | Sí | Devuelve las sesiones semanales de horario de la materia |
| **Materias** | `DELETE` | `/api/subjects/:subjectId` | Sí | Elimina la materia y sus calificaciones vinculadas |
| **Notas** | `POST` | `/api/subjects/:subjectId/grades` | Sí | Registra una nota (`0.0–5.0`), porcentaje (`1–100`) y corte (`1–4`) |
| **Notas** | `GET` | `/api/subjects/:subjectId/grades` | Sí | Lista las notas de una materia y su promedio ponderado |
| **Notas** | `GET` | `/api/subjects/:subjectId/progress` | Sí | Proyecta estado de aprobación y nota necesaria en lo restante |
| **Notas** | `GET` | `/api/grades` | Sí | Consolidado general de notas filtrable por `semester` y `corte` |
| **Notas** | `GET` | `/api/grades/average` | Sí | Promedio general ponderado por créditos (PGA), filtrable por `semester` |
| **Notas** | `PATCH` | `/api/grades/:gradeId` | Sí | Edita una calificación propia (la suma de porcentajes no puede pasar de 100%) |
| **Notas** | `DELETE` | `/api/grades/:gradeId` | Sí | Elimina una calificación propia y devuelve el resumen actualizado |
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
| **Tareas** | `GET` | `/api/tasks` | Sí | Lista tareas, recordatorios y notas, manuales e importadas de Moodle/Classroom (`status`, `type`, `priority`, `subjectId`, `dueDate`, `search`, `source`, `archived`), ordenadas por fecha de entrega |
| **Tareas** | `POST` | `/api/tasks` | Sí | Crea una tarea (`type`: `tarea`/`recordatorio`/`nota`) con prioridad, materia, `dueDate` + `dueTime` y subtareas; programa sus recordatorios (`201`) |
| **Tareas** | `GET` | `/api/tasks/:taskId` | Sí | Detalle de una tarea (`{ task }`) |
| **Tareas** | `PATCH` | `/api/tasks/:taskId` | Sí | Actualiza la tarea. En las importadas solo se cambian estado, prioridad, materia y subtareas |
| **Tareas** | `PATCH` | `/api/tasks/:taskId/complete` | Sí | Marca la tarea como `realizada` y cancela sus recordatorios |
| **Tareas** | `PATCH` | `/api/tasks/:taskId/archive` | Sí | Archiva la tarea (sale de la lista principal y se cancelan sus recordatorios) |
| **Tareas** | `PATCH` | `/api/tasks/:taskId/restore` | Sí | Restaura una tarea archivada (`GET /api/tasks?archived=true` lista las archivadas) |
| **Tareas** | `DELETE` | `/api/tasks/:taskId` | Sí | Elimina una tarea creada en NotiU (las importadas se marcan como realizadas) |
| **Integraciones** | `GET` | `/api/integrations` | Sí | Estado de Moodle y Classroom (conectado, última sincronización, errores) |
| **Integraciones** | `PUT` | `/api/integrations/moodle` | Sí | Conecta Moodle con el enlace de exportación del calendario (`icalUrl`) y sincroniza |
| **Integraciones** | `POST` | `/api/integrations/classroom` | Sí | Conecta Classroom con el `serverAuthCode` de Google Sign-In y sincroniza |
| **Integraciones** | `POST` | `/api/integrations/:provider/sync` | Sí | Sincroniza ahora (`moodle` o `classroom`); máximo una vez por minuto (`429`) |
| **Integraciones** | `DELETE` | `/api/integrations/:provider` | Sí | Desconecta la plataforma y borra sus tareas importadas |
| **Dispositivos** | `POST` | `/api/devices` | Sí | Registra el Expo push token del celular (`token`, `platform`) |
| **Dispositivos** | `DELETE` | `/api/devices` | Sí | Elimina el token (body `{ token }`) al cerrar sesión |

Los endpoints protegidos requieren el encabezado:

```
Authorization: Bearer <ID token de Firebase>
```

### Estructura del código (`backend/src/`)

```
backend/src/
├── config/env.ts                      Variables de entorno (.env)
├── config/firebase.ts                 Firebase Admin: Auth + Firestore
├── models/                            Modelos de dominio y DTOs (incluye task, integration)
├── utils/                             Validadores, cifrado, fechas, helpers de Firestore, HttpError
├── services/                          Lógica de negocio
│   ├── integrations/                  Conectores (patrón Strategy): Moodle iCal y Classroom
│   ├── notifications/                 Envío de push con Expo
│   ├── sync.service.ts                Motor de sincronización (detecta nuevas tareas y cambios)
│   └── reminder.service.ts            Programación y envío de recordatorios
├── jobs/                              Sincronización periódica y recordatorios
├── middlewares/                       requireAuth (Firebase), requireRole, errores y 404
├── controllers/                       Controladores HTTP por módulo
├── routes/                            Definición de rutas Express
├── app.ts                             Configuración principal de Express
└── server.ts                          Arranque: carga usuarios, abre el puerto e inicia los jobs
```

### Configuración de Firebase (una sola vez)

1. Crear un proyecto en la [consola de Firebase](https://console.firebase.google.com) (por ejemplo `notiu-xxxxx`).
2. **Authentication → Sign-in method:** activar *Correo electrónico/contraseña* y *Google*.
3. **Firestore Database → Crear base de datos** (modo producción, región `southamerica-east1` o `us-central1`). Publicar las reglas de `backend/firestore.rules`.
4. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.** Guardar el archivo como `backend/serviceAccountKey.json` (ya está en `.gitignore`, **nunca** subirlo a git).
5. **Configuración del proyecto → General → Agregar app** Android (paquete, p. ej. `co.edu.notiu`) e iOS, y descargar `google-services.json` / `GoogleService-Info.plist` para la app móvil.

### Configuración de Google Classroom (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com) abrir **el mismo proyecto** de Firebase y habilitar la **Google Classroom API**.
2. **Pantalla de consentimiento OAuth:** tipo *Externo*, agregar los scopes `classroom.courses.readonly` y `classroom.coursework.me.readonly`, y agregar como **usuarios de prueba** los correos del equipo (máximo 100 mientras la app no esté verificada).
3. **Credenciales:** usar el cliente OAuth de tipo *Aplicación web* que crea Firebase (el mismo `webClientId` de la app). Copiar su *Client ID* y *Client secret* en `.env`.
4. Las cuentas institucionales pueden tener bloqueadas las apps externas: si falla, probar con una cuenta personal de Classroom.

### Cómo correrlo

Requisitos: **Node.js 22.12 o superior** y npm (`node -v` para verificar).

```bash
cd backend
npm install
cp .env.example .env      # y llenar los valores
npm run dev               # http://localhost:3000
```

**Sin credenciales (emuladores):** con `firebase-tools` y Java 11+ instalados:

```bash
npm run emulators         # Auth en 9099, Firestore en 8080, UI en 4000
# En .env: FIREBASE_PROJECT_ID=demo-notiu, FIRESTORE_EMULATOR_HOST=127.0.0.1:8080,
#          FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
npm run dev
```

**Pruebas de punta a punta** (usa el emulador de Auth, no necesita Java ni credenciales):

```bash
npm run test:e2e
```

### Probarlo con Postman

Como el login ahora lo hace Firebase, primero se obtiene un **ID token**:

- **Con emuladores:** `POST http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo` con body `{"email":"ana@uni.edu","password":"secreta123","returnSecureToken":true}` (o `accounts:signInWithPassword` si ya existe).
- **Con el proyecto real:** `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<Web API Key>` con el mismo body.

Copiar el campo `idToken` de la respuesta en la variable `token` de la colección (dura 1 hora). Script *Post-response* sugerido:

```js
const data = pm.response.json();
if (data.idToken) pm.collectionVariables.set("token", data.idToken);
```

Flujo sugerido: `GET /api/auth/me` → `PUT /api/integrations/moodle` con `{"icalUrl": "<enlace de Moodle>"}` → `GET /api/tasks` → `GET /api/notifications`.

**Cómo obtener el enlace de Moodle:** Calendario → *Importar o exportar calendarios* → *Exportar calendario* → Eventos: *Todos*, Período: *Eventos recientes y próximos* → *Obtener URL del calendario*.

### Limitaciones conocidas

- El enlace iCal de Moodle no indica si una tarea ya fue entregada: el estudiante la marca como completada en NotiU.
- Google limita a 100 usuarios de prueba mientras la pantalla de consentimiento de Classroom no esté verificada.
- Los jobs corren dentro del mismo proceso: en hostings que "duermen" el servidor, la sincronización se pausa mientras duerme.

---

## Próximos pasos

**Para probar y publicar**
- Compilar la *development build* y probar en un celular real el push, el inicio de sesión con Google y la conexión con Classroom (pasos arriba). Hasta ahora solo se han verificado con compilación y pruebas automáticas.
- Publicar el backend en un servidor siempre encendido (por ejemplo Render, Railway, Fly.io o Cloud Run). Mientras corra en un portátil, la sincronización y los recordatorios se detienen al apagarlo. El plan gratuito de Firebase no incluye Cloud Functions.
- Compilar los `.tex` (que `terminos_y_condiciones.tex` siga cabiendo en una página) y revisar el texto legal sobre datos de Google ("Uso Limitado").

**Pantallas que faltan en la app** (el backend ya tiene los endpoints)
- Calificaciones por cortes y proyección de nota (`/api/subjects/:id/grades`, `/api/subjects/:id/progress`, `/api/grades`).
- Apuntes (`/api/notes`).
- Compañeros y conexiones (`/api/peers`, `/api/connections`) y grupos de estudio (`/api/study-groups`).
- Tips de estudio (`/api/tips`) y perfil académico (`/api/profile`).
- Mi Espacio / Plan de Estudio con temporizador Pomodoro (diseñado, sin backend ni pantalla).

**Mejoras opcionales**
- Recibos de Expo: guardar los `id` de los tickets y, en un job cada 15 minutos, consultar `getPushNotificationReceiptsAsync` para borrar los tokens con `DeviceNotRegistered`.
- Correo: respetar `settings.notifications.email` con un resumen diario (Resend o Nodemailer).
- Límite de peticiones (`express-rate-limit`) en `/api/integrations/*`.
- Pruebas automáticas para la app móvil (hoy se valida con `tsc`, `expo lint` y `expo export`).
- Verificación de Google para Classroom si la app va a superar 100 usuarios.

---

## Notas de Versión (*Release Notes*)

- **`v0.7.0` (19 nov 2026):** Todos los módulos del backend pasan a **Firestore** (materias, notas, apuntes, conexiones, grupos con transacciones y tips) y se elimina la caché de usuarios (115 pruebas e2e). App móvil con **inicio de sesión con Google**, **conexión con Classroom**, **notificaciones push** (Expo), pantallas de **Notificaciones**, **Perfil** con ajustes de recordatorios, **Detalle de tarea** y **Conexiones**, configuración de EAS y ESLint. Limpieza: código y dependencias sin uso, texto con tildes dañadas en Materias reparado, fuentes cargadas por estilo (la app solo incluye las que usa) y Playfair Display cargada de nuevo.

- **`v0.6.1` (19 nov 2026):** App móvil conectada a Firebase Auth (registro, login persistente, recuperar contraseña y cerrar sesión), endpoints para archivar y restaurar tareas, pantalla para conectar Moodle desde el Inicio y recarga del Inicio al volver a la pantalla.
- **`v0.6.0` (19 nov 2026):** Autenticación con **Firebase Auth** (ID tokens) y persistencia en **Firestore** para usuarios, ajustes y notificaciones. Módulo de **tareas** unificado (`/api/tasks`: las creadas en NotiU y las importadas, con prioridad, subtareas y recordatorios), **integraciones** con Moodle por iCal y Google Classroom por OAuth (`/api/integrations`), **dispositivos** para push con Expo (`/api/devices`), motor de sincronización con detección de tareas nuevas y cambios de fecha, recordatorios configurables, jobs periódicos, cifrado de secretos y pruebas de punta a punta (`npm run test:e2e`).
- **`v0.5.0` (5–7 nov 2026):** Módulo de calificaciones por cortes (`/api/grades`, `/api/subjects/:id/grades`), proyección de nota necesaria para aprobar (`/api/subjects/:id/progress`), eliminación en cascada de materias (`DELETE /api/subjects/:id`) y documentación formal en LaTeX en `docs/` (manual técnico, sistema de diseño UI/UX y términos y condiciones preliminares de 1 página).
- **`v0.4.0` (4–5 nov 2026):** Módulo de materias (`POST/GET/PATCH /api/subjects`) y consulta de horario semanal (`GET /api/subjects/:subjectId/schedule`).
- **`v0.3.0` (4 nov 2026):** Módulos de perfil universitario (`GET/PATCH /api/profile`) y preferencias de usuario (`GET/PATCH /api/settings`).
- **`v0.2.0` (2 nov 2026):** Endpoint paginado de notificaciones (`GET /api/notifications`) con soporte para fuentes `MOODLE`, `CLASSROOM` y `SYSTEM`, y configuración de `.gitignore`.
- **`v0.1.0` (31 oct 2026):** Fundación del monorepo (`backend/`, `mobile/`, `docs/`), servidor Express 5 + TypeScript, hashing `scrypt`, `GET /api/health` y módulo completo de autenticación `/api/auth` (Taller 3).
