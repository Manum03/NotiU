# NotiU

## Estructura del repositorio

```
NotiU/
├── backend/   API en Node.js + TypeScript
├── mobile/    Aplicación móvil
└── docs/      Documentación
```

## Backend: API de autenticación (login)

API REST hecha con **Node.js**, **TypeScript** y **Express 5**.

- **Sin base de datos:** los usuarios y las sesiones se guardan en arrays en memoria, así que se reinician cada vez que se reinicia el servidor.
- **Tipado:** modelos (`User`, `Session`) y DTOs de request/response definidos en TypeScript.
- **Validaciones:** campos obligatorios, formato de email, contraseña de mínimo 8 caracteres y rol válido. Todos los errores se devuelven juntos en `details`.
- **Manejo de errores:** respuestas JSON uniformes con los códigos 400, 401, 403, 404, 409 y 500, incluido el caso de JSON mal formado.
- **Seguridad:** las contraseñas se guardan hasheadas con `scrypt` (módulo `crypto` de Node). Los tokens son aleatorios y expiran en 1 hora.

### Endpoints

Base: `http://localhost:3000/api/auth`

| Método | Ruta | Requiere token | Descripción |
|---|---|---|---|
| POST | `/register` | No | Registra un usuario y devuelve un token (201) |
| POST | `/login` | No | Inicia sesión con email y contraseña, devuelve un token |
| GET | `/me` | Sí | Devuelve el perfil del usuario autenticado |
| PATCH | `/password` | Sí | Cambia la contraseña y cierra las demás sesiones del usuario |
| POST | `/logout` | Sí | Cierra la sesión actual |
| GET | `/users` | Sí (solo admin) | Lista los usuarios, sin la contraseña |

También existe `GET /api/health` para comprobar que el servidor está arriba.

Los endpoints protegidos necesitan el header:

```
Authorization: Bearer <token>
```

**Usuario de prueba** (se crea al iniciar el servidor):

- Email: `admin@notiu.com`
- Contraseña: `admin1234`
- Rol: `admin`

### Estructura del código

```
backend/src/
├── config/env.ts                      Puerto y duración de la sesión
├── models/
│   ├── user.model.ts                  Modelo User y PublicUser
│   ├── session.model.ts               Modelo Session
│   └── auth.dto.ts                    DTOs de request y response
├── utils/
│   ├── validators.ts                  Validación de los bodies
│   ├── password.ts                    Hash y verificación de contraseñas
│   └── http-error.ts                  Clase HttpError
├── services/auth.service.ts           Lógica y arrays en memoria
├── middlewares/
│   ├── auth.middleware.ts             requireAuth y requireRole
│   └── error.middleware.ts            Manejo de errores y 404
├── controllers/auth.controller.ts     Controladores HTTP
├── routes/auth.routes.ts              Definición de rutas
├── app.ts                             Configuración de Express
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

Con el servidor corriendo (`npm run dev`):

#### 1. Preparar la colección

1. En Postman, crear una colección nueva llamada **NotiU**.
2. En la pestaña **Variables** de la colección, agregar:

   | Variable | Valor |
   |---|---|
   | `baseUrl` | `http://localhost:3000/api/auth` |
   | `token` | (vacío, se llena solo al hacer login) |

3. En la pestaña **Authorization** de la colección, elegir **Bearer Token** y en *Token* poner `{{token}}`. Así todas las peticiones envían el token automáticamente.

#### 2. Crear las peticiones

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

- Los datos se pierden al reiniciar el servidor (no hay base de datos).
- `/register` acepta cualquier `role`, incluido `admin`.
