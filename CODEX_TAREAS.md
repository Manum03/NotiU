# Tareas para Codex — NotiU v0.6.1 → v0.7.0

> **Ya hecho en v0.6.1 (no lo repitas):** login, registro, recuperar contraseña y logout con el **SDK web de Firebase** (`src/config/firebase.ts`, `src/services/auth/authService.ts`); `authStorage.getSession()` devuelve el ID token de Firebase; `api.ts` lee `EXPO_PUBLIC_API_URL`, pone el token solo y reintenta ante `401`; el `AppNavigator` abre el Home si hay sesión; endpoints de archivar/restaurar (`PATCH /tasks/:id/archive|restore`, `GET /tasks?archived=true`); pantalla `features/integrations/screens/ConnectMoodleScreen.tsx` enlazada desde la tarjeta "Universidad / Plataforma" del Home; el Home recarga al volver a la pantalla; `app.json` ya se llama NotiU.

> Documento de trabajo para un agente de código (Codex). Léelo completo antes de empezar.
> Idioma del proyecto: código en inglés, **comentarios, mensajes de error y textos de UI en español**.

## 0. Contexto

NotiU es una app para estudiantes universitarios que **centraliza las tareas de Moodle y Google Classroom y envía notificaciones y recordatorios** antes de cada entrega.

- `backend/`: Node.js 22.12+, Express 5, TypeScript, **Firebase Admin (Auth + Firestore)**. Ya implementado y probado en v0.6.0:
  auth con ID tokens de Firebase, tareas, integraciones (Moodle por iCal y Classroom por OAuth), motor de sincronización, push con Expo, recordatorios, jobs y pruebas e2e.
- `mobile/`: Expo SDK 58, React Native 0.88, React 19, TypeScript. **Navegación con React Navigation** (`src/navigation/AppNavigator`). Hay pantallas de bienvenida, login y registro y un cliente HTTP en `src/services/api/api.ts`.
- `docs/`: documentación en LaTeX.

Lee `README.md` (sección Backend) para la lista completa de endpoints.

## 1. Reglas obligatorias

1. **Sigue los patrones que ya existen.** No introduzcas otros estilos:
   - Backend: capas `models/` (`*.model.ts` + `*.dto.ts`) → `utils/*.validators.ts` → `services/*.service.ts` (objeto `xService = { ... }`) → `controllers/*.controller.ts` (objeto `xController`) → `routes/*.routes.ts` (`xRouter`). Errores con `HttpError(status, mensaje, details?)`. Los controladores leen el usuario con `const { session } = res.locals as AuthLocals;` y usan `session.userId` (UID de Firebase, `string`).
   - Firestore: helpers de `utils/firestore.ts` (`toDate`, `iso`, `chunk`), funciones `fromDoc`/`toDto` en cada servicio, y **solo consultas de un campo** (o filtros en memoria) para no necesitar índices compuestos.
   - Móvil: estructura por *features* (`src/features/<feature>/{screens,components,hooks}`), servicios en `src/services/{api,notifications,storage}`, colores y espacios de `src/config/theme.ts`, botón `src/shared/components/NotiUButton.tsx`, fuentes ya cargadas en `App.tsx`. **Mantén React Navigation** (no migres a Expo Router aunque `mobile/AGENTS.md` lo mencione; actualiza esa línea de `AGENTS.md`).
2. **Expo cambia en cada SDK:** antes de usar cualquier API de Expo/React Native, consulta `https://docs.expo.dev/versions/v58.0.0/` y `https://docs.expo.dev/llms.txt`. Instala con `npx expo install <paquete>`, nunca con `npm install`.
3. **Nunca** subas credenciales: `serviceAccountKey.json`, `.env`, `google-services.json` y `GoogleService-Info.plist` van en `.gitignore`.
4. Antes de terminar cada bloque:
   - Backend: `cd backend && npm run typecheck && npm run test:e2e`.
   - Móvil: `cd mobile && npx tsc --noEmit && npx expo lint`.
5. Haz commits pequeños por bloque, con mensajes en español.

---

## 2. Backend

### 2.1 Limpieza (rápido)

- Elimina los archivos de respaldo del móvil (`*.backup*`, `*.bak-*` en `mobile/src/features/tasks/screens` y `mobile/src/features/subjects/screens`), previa confirmación del equipo.
- Elimina los archivos que ya no se usan: `backend/src/utils/password.ts`, `backend/src/models/session.model.ts`, `backend/src/services/authStorage.ts` (archivo vacío) y `backend/tests/.gitkeep`.
- En la raíz del repo hay archivos fuera de lugar: `AddSubjectScreen_backup.tsx`, `HomeScreen_completo.txt` y `src/features/subjects/screens/AddSubjectScreen.tsx`. Pregunta al equipo si se mueven a `mobile/src/features/subjects/` o se borran; no los borres sin confirmar.
- `backend/public/index.html` (frontend de prueba) usa el login antiguo (`/api/auth/login`). Cámbialo por un campo donde se pegue un **ID token de Firebase** (con un enlace a cómo obtenerlo en el README), o usa el SDK web de Firebase Auth desde CDN con email/contraseña. Agrega vistas simples para `GET /api/tasks`, `GET /api/integrations` y `PUT /api/integrations/moodle`.

### 2.2 Migrar los módulos en memoria a Firestore

Hoy siguen en arreglos en memoria: **subjects, grades, notes, connections, study-groups, tips (guardados) y profile**. (Usuarios, ajustes, **tareas**, notificaciones, integraciones, dispositivos y recordatorios ya están en Firestore: úsalos como referencia, en especial `services/task.service.ts`.) Migra uno por uno, sin cambiar los contratos HTTP (mismas rutas, mismos DTOs y códigos de estado):

| Módulo | Ubicación sugerida en Firestore |
|---|---|
| Perfil | `profiles/{uid}` |
| Materias | `users/{uid}/subjects/{subjectId}` |
| Notas (calificaciones) | `users/{uid}/grades/{gradeId}` (campo `subjectId`) |
| Apuntes | `users/{uid}/notes/{noteId}` |
| Conexiones | `connections/{id}` con `requesterId`, `targetId` y `participants: [a, b]` (consulta con `array-contains`) |
| Grupos de estudio | `studyGroups/{groupId}` con `memberIds: string[]` |
| Tips | catálogo en `tips/{tipId}` (semilla al arrancar si la colección está vacía); guardados en `users/{uid}/savedTips/{tipId}` |

- Los servicios pasan a ser `async` y los controladores `async ... Promise<void>` (Express 5 propaga los errores de las promesas).
- Mantén la validación de UUID en los params donde ya existe (`validateUuidParam`) o cámbiala por `validateDocId` de `utils/task.validators.ts` si los IDs pasan a ser de Firestore.
- Eliminación en cascada: al borrar una materia, borrar sus `grades` (con `batch`).
- Cuando todos los módulos sean async, elimina la **caché de usuarios** de `services/auth.service.ts` (`loadCache`) y haz `getProfile` async leyendo `users/{uid}`.
- Amplía `tests/fake-firestore.ts` si necesitas operadores nuevos (`array-contains`, `!=`) y agrega casos a `tests/api.e2e.ts` para cada módulo migrado.

### 2.3 Mejoras opcionales (si alcanza el tiempo)

- **Recibos de Expo:** guardar los `id` de los tickets y, en un job cada 15 min, consultar `expo.getPushNotificationReceiptsAsync` para borrar tokens con `DeviceNotRegistered`.
- **Canal de correo:** respetar `settings.notifications.email` enviando un resumen diario con Resend o Nodemailer.
- **Rate limiting** básico (`express-rate-limit`) en `/api/integrations/*`.

### 2.4 Documentación

- `docs/documentacion_notiu.tex`: agregar las notas de versión `v0.6.0` (mismo texto que en el README), actualizar la tabla de endpoints y la sección de arquitectura (Firebase, Firestore, conectores con patrón Strategy, jobs).
- `docs/terminos_y_condiciones.tex` (máximo 1 página): agregar el tratamiento de datos (Firebase/Google, enlace iCal y tokens cifrados, solo lectura de Classroom, derecho a desconectar y borrar datos), mencionando la **Ley 1581 de 2012** (Colombia). Google exige una política de privacidad para la pantalla de consentimiento OAuth.

---

## 3. Móvil (Expo SDK 58)

### 3.1 Configuración

- `app.json`: `name: "NotiU"`, `slug: "notiu"`, `scheme: "notiu"`, `userInterfaceStyle: "dark"`, `android.package` y `ios.bundleIdentifier` (p. ej. `co.edu.notiu`; **deben coincidir con las apps registradas en Firebase**), `android.googleServicesFile: "./google-services.json"`, `ios.googleServicesFile: "./GoogleService-Info.plist"` y los plugins que pidan las librerías.
- URL del backend: reemplaza la IP fija de `src/services/api/api.ts` por `process.env.EXPO_PUBLIC_API_URL` (crea `mobile/.env.example` con `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api` y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=`).
- **Development build obligatoria:** las push y los módulos nativos (Firebase, Google Sign-In) no funcionan en Expo Go. Configura `eas.json` con el perfil `development` y documenta `npx eas-cli@latest build --profile development --platform android`.

### 3.2 Autenticación con Firebase

- **Correo/contraseña ya funciona** con el SDK web de Firebase (no lo migres a React Native Firebase). Falta **"Continuar con Google"**: usa `@react-native-google-signin/google-signin` (requiere development build), obtén el `idToken` y entra con `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))` usando el `auth` de `src/config/firebase.ts`. Verifica la API actual en la documentación de la librería.
- Los puntos siguientes de esta sección ya están hechos; úsalos como referencia del contrato.
- Crea `src/services/auth/authService.ts` (o dentro de `services/storage`, como prefiera el equipo) con:
  - `registerWithEmail(name, email, password)` → `createUserWithEmailAndPassword` + `updateProfile({ displayName: name })` + `GET /auth/me`.
  - `loginWithEmail(email, password)`, `loginWithGoogle()` (credencial de Google → Firebase), `logout()` (antes de salir: `DELETE /devices` con el token push), `sendPasswordReset(email)`.
  - `getIdToken()` → `auth.currentUser.getIdToken()` (Firebase lo renueva solo).
  - Un hook `useAuth()` en `src/features/auth/hooks/` que escuche `onAuthStateChanged` y lo use `AppNavigator` para mostrar el stack de auth o el de la app.
- **Adapta `src/services/api/api.ts`:** si no se pasa `token`, obtiene el ID token de Firebase automáticamente. Ante un `401`, fuerza la renovación (`getIdToken(true)`) y reintenta **una sola vez**. Los errores del backend tienen la forma `{ error, details? }`: muestra `details` cuando exista.
- **Adapta `src/services/storage/authStorage.ts`:** la sesión ya la persiste Firebase. Elimina `saveSession`, `getSession`, `getToken` y **sobre todo `registerLocalUser` (guarda contraseñas en texto plano en el celular)**. Mantén `getStoredUser()` leyendo de `auth.currentUser` / `GET /auth/me` para no romper el Home.
- **`RegisterScreen` y `LoginScreen`:** conserva el diseño y las validaciones actuales y reemplaza la llamada a `/auth/register` por `registerWithEmail`. El login usa **correo** (no "usuario"). Traduce los códigos de Firebase (`auth/email-already-in-use`, `auth/invalid-credential`, `auth/weak-password`, `auth/network-request-failed`) a mensajes en español. Agrega "¿Olvidaste tu contraseña?" y "Continuar con Google".

### 3.3 Notificaciones push

En `src/services/notifications/pushService.ts`:

- `expo-notifications` + `expo-device` (+ `expo-constants` para el `projectId` de EAS).
- Pedir permiso tras el primer login, crear el canal Android **`default`** (el backend envía con `channelId: "default"`), obtener `getExpoPushTokenAsync({ projectId })` y llamar `POST /devices` con `{ token, platform }`.
- Manejar el toque en la notificación: si `data.taskId` existe, navegar al detalle de la tarea; si no, a Notificaciones.
- Configurar el *handler* para mostrar las alertas también con la app abierta.
- Credenciales: FCM V1 en EAS (`eas credentials`), según `https://docs.expo.dev/push-notifications/fcm-credentials/`.

### 3.4 Pantallas nuevas (diseño oscuro existente; colores de urgencia del README: Alta `#EE6520`, Media `#EEE620`, Baja `#20EEDB`, Sin fecha `#BF20EE`)

1. **Inicio** (revisa primero lo que el equipo ya tiene en `HomeScreen`): agrega las tareas importadas, que llegan en el mismo `GET /tasks` (`?status=pendiente`), agrupadas por "Hoy", "Mañana", "Esta semana", "Más adelante" y "Sin fecha" usando `dueAt`. Muestra un distintivo de origen (`source`: Moodle/Classroom) y `courseName`. Color por urgencia según lo que falta: < 24 h Alta, < 72 h Media, resto Baja, sin fecha morado; `isOverdue` en rojo. Pull-to-refresh.
2. **Detalle de tarea**: título, curso, fecha (formato `es-CO`), descripción, subtareas, botón "Abrir en Moodle/Classroom" (`Linking.openURL(url)`) y "Marcar como realizada" (`PATCH /tasks/:id/complete`; para deshacer, `PATCH /tasks/:id { status: "pendiente" }`). En las importadas oculta la edición de título, descripción, tipo y fecha (el backend responde `400`).
3. **Conexiones** (`features/integrations/`): tarjetas de Moodle y Classroom desde `GET /integrations` con estado (conectado, error, `needs_reauth` con botón "Reconectar"), última sincronización, botón "Sincronizar ahora" (`POST /integrations/:provider/sync`; si llega `429`, mostrar "espera un minuto") y "Desconectar" con confirmación.
   - **Moodle:** pantalla con los pasos para copiar el enlace (Calendario → Importar o exportar calendarios → Exportar calendario → Eventos: Todos, Período: Eventos recientes y próximos → Obtener URL del calendario), un campo para pegarlo (aceptar `webcal://`), botón "Pegar" del portapapeles (`expo-clipboard`) y `PUT /integrations/moodle { icalUrl }`. Mostrar "Importamos N tareas" con `sync.created`.
   - **Classroom:** `GoogleSignin.configure({ webClientId: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, offlineAccess: true, scopes: ["https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/classroom.coursework.me.readonly"] })`; tras el sign-in, enviar `serverAuthCode` a `POST /integrations/classroom { serverAuthCode }`. Si no llega `serverAuthCode`, cerrar sesión de Google y repetir (`forceCodeForRefreshToken` en Android, según la documentación).
4. **Nueva tarea**: si el equipo ya tiene un formulario, conéctalo a `POST /tasks` con `{ title, description?, type, priority, subjectId?, dueDate: "YYYY-MM-DD", dueTime: "HH:mm", subtasks?: [{ title, completed? }] }`. Para elegir fecha y hora usa `@react-native-community/datetimepicker` (instalado con `npx expo install`).
5. **Notificaciones** (`features/notifications/`): lista paginada (`GET /notifications?page=&limit=`), indicador de no leídas (`meta.unreadCount`, también como *badge* en la pestaña), tocar = `PATCH /notifications/:id/read` y abrir la tarea, botón "Marcar todas como leídas" (`POST /notifications/read-all`). Icono según `kind`: `NEW_TASK`, `DUE_DATE_CHANGED`, `REMINDER`, `SYNC_SUMMARY`, `SYSTEM`.
6. **Ajustes de recordatorios** (en Perfil): chips para escoger hasta 5 tiempos (1 semana=10080, 2 días=2880, 1 día=1440, 6 h=360, 2 h=120, 1 h=60, 30 min=30) → `PATCH /settings { reminders: { offsetsMinutes } }`; interruptor de push → `PATCH /settings { notifications: { push } }`; botón "Enviar notificación de prueba" → `POST /notifications/test`.
7. Navegación: tabs inferiores **Inicio · Conexiones · Notificaciones · Perfil**, dentro del `AppNavigator` existente.

### 3.5 Contrato de la API (resumen)

```ts
// GET /api/tasks?status=&type=&priority=&subjectId=&dueDate=&search=&source= -> { tasks: TaskDto[], total }
// GET /api/tasks/:id -> { task } · POST/PATCH -> { message, task } · PATCH /:id/complete -> { message, task }
type TaskDto = {
  id: string; title: string; description: string;
  type: "tarea" | "recordatorio" | "nota";
  status: "pendiente" | "en_curso" | "realizada";
  priority: "baja" | "media" | "alta";
  subjectId: string | null;
  dueDate: string | null /* "YYYY-MM-DD" */; dueTime: string | null /* "HH:mm", null = todo el día */;
  subtasks: { id: string; title: string; completed: boolean }[]; progress: number /* 0-100 */;
  createdAt: string; updatedAt: string; completedAt: string | null;
  source: "MANUAL" | "MOODLE" | "CLASSROOM"; courseName: string | null; url: string | null;
  dueAt: string | null /* ISO, calculado */; isOverdue: boolean;
};

// GET /api/integrations -> { data: IntegrationDto[] }
type IntegrationDto = {
  provider: "moodle" | "classroom"; label: string; connected: boolean;
  status: "active" | "error" | "needs_reauth" | null; displayName: string | null;
  lastSyncAt: string | null; lastSuccessAt: string | null; lastError: string | null;
  lastStats: { total: number; created: number; updated: number; notified: number } | null;
};
// PUT /api/integrations/moodle { icalUrl } | POST /api/integrations/classroom { serverAuthCode }
//   -> { message, integration: IntegrationDto, sync: { provider, total, created, updated, notified, durationMs } }

// GET /api/notifications -> { data: NotificationDto[], meta: { page, limit, total, totalPages, unreadCount } }
type NotificationDto = {
  id: string; title: string; body: string; category: "URGENT" | "INFORMATIVE";
  source: "MOODLE" | "CLASSROOM" | "SYSTEM";
  kind: "NEW_TASK" | "DUE_DATE_CHANGED" | "REMINDER" | "SYNC_SUMMARY" | "SYSTEM";
  taskId: string | null; isRead: boolean; createdAt: string; /* ... */
};

// Push recibido: data = { notificationId?, taskId?, kind }
// Errores: { error: string, details?: string[] } con 400/401/403/404/409/429/500
```

### 3.6 Criterios de aceptación

- Registro, login con correo, login con Google, recuperar contraseña y logout funcionan contra Firebase real.
- Al conectar Moodle con un enlace real se listan las tareas y llega el push "Moodle conectado".
- Al crear una tarea que vence en 2 h 10 min con el recordatorio de 2 h activo, el push llega unos 10 minutos después.
- Tocar una notificación abre la tarea correcta.
- `npx tsc --noEmit` y `npx expo lint` sin errores; backend `npm run typecheck` y `npm run test:e2e` en verde.
