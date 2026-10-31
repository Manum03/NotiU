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

### Probarlo con curl

```bash
# Registrar un usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@uni.edu","password":"secreta123"}'

# Iniciar sesión (copiar el "token" de la respuesta)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@uni.edu","password":"secreta123"}'

# Ver el perfil con el token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Cambiar la contraseña
curl -X PATCH http://localhost:3000/api/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"currentPassword":"secreta123","newPassword":"nueva12345"}'

# Cerrar sesión
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

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
