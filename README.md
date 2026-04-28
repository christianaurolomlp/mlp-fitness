# ⚓ MLP FITNESS

Tu alternativa personal a Hevy — tracking de gym con estética naval MLP.

## Stack
- **Backend**: Node.js + Express
- **BD**: PostgreSQL (Railway)
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Deploy**: Railway (monolito)

---

## Deploy en Railway (paso a paso)

### 1. Crear cuenta Railway
Ve a [railway.app](https://railway.app) y regístrate.

### 2. Subir código a GitHub
```bash
git init
git add .
git commit -m "Initial commit: MLP FITNESS"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mlp-fitness.git
git push -u origin main
```

### 3. Crear proyecto en Railway
1. New Project → Deploy from GitHub repo → selecciona `mlp-fitness`
2. Railway detecta automáticamente el proyecto Node.js

### 4. Agregar PostgreSQL
1. En el proyecto Railway → New → Database → Add PostgreSQL
2. Railway inyecta `DATABASE_URL` automáticamente

### 5. Configurar variables de entorno
En Settings → Variables, agrega:
```
AUTH_PASSWORD=MLP_CAPI_2026       ← Tu contraseña (cámbiala)
JWT_SECRET=una_cadena_muy_larga_y_aleatoria_aqui_2026
NODE_ENV=production
```
> `DATABASE_URL` y `PORT` los inyecta Railway automáticamente.

### 6. Deploy
Railway hace deploy automático al pushear a `main`.

### 7. Generar dominio público
Settings → Networking → Generate Domain → copia la URL.

### 8. Primer login
Entra a tu URL pública y usa el `AUTH_PASSWORD` que configuraste.

---

## Desarrollo local

```bash
# Instalar dependencias
npm run install:all

# Levantar backend (necesitas .env configurado)
cp .env.example .env
# Edita .env con tu DATABASE_URL local

npm run dev:backend   # Puerto 3000
npm run dev:frontend  # Puerto 5173 (proxy a 3000)

# Build de producción
npm run build
npm start
```

---

## Estructura del proyecto

```
mlp-fitness/
├── backend/
│   ├── server.js               # Entry point Express
│   └── src/
│       ├── db/index.js         # Pool pg + auto-init
│       ├── middleware/auth.js  # JWT middleware
│       └── routes/
│           ├── auth.js
│           ├── rutinas.js
│           ├── ejercicios.js
│           ├── entrenos.js
│           └── stats.js
├── database/
│   ├── schema.sql              # Tablas (auto-ejecutado)
│   └── seed.js                 # Rutina completa de Capi
├── frontend/
│   └── src/
│       ├── pages/              # Login, Home, Rutina, Entreno...
│       ├── components/         # EjercicioVisual, Timer, NavBar...
│       ├── hooks/useAuth.js
│       └── utils/api.js
├── .env.example
├── railway.json
└── package.json (root)
```

---

## Funcionalidades

- ✅ Login con contraseña única (JWT 30 días)
- ✅ Dashboard con rutina del día + stats semanales
- ✅ Vista previa de rutina con último peso usado
- ✅ Modo ejecución mobile-first: peso, reps, RPE
- ✅ Timer de descanso con circle progress + sonido
- ✅ Detección automática de PRs con animación
- ✅ Historial con filtro por rutina + export CSV
- ✅ Gráficas de progresión por ejercicio + 1RM estimado
- ✅ Editor de rutinas (sin borrar histórico)
- ✅ Rutina completa pre-cargada (Push/Pull/Legs × 5 días)
- ✅ Componente EjercicioVisual con gradientes por grupo muscular
