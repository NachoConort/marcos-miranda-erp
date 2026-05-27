# ERP Sistema

## Requisitos
- Node.js 18+
- MongoDB local o MongoDB Atlas

## Arrancar el proyecto

### 1. Backend
```bash
cd backend
cp .env.example .env      # Editar MONGODB_URI y JWT_SECRET
npm install
npm run dev               # Corre en http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev               # Corre en http://localhost:5173
```

## Estructura
```
erp-system/
├── backend/
│   └── src/
│       ├── config/       # Conexión a MongoDB
│       ├── controllers/  # Lógica de negocio
│       ├── middlewares/  # Auth JWT, roles
│       ├── models/       # Schemas de Mongoose
│       ├── routes/       # Endpoints de la API
│       └── index.js      # Punto de entrada
└── frontend/
    └── src/
        ├── components/   # Layout, UI reutilizable
        ├── pages/        # Una carpeta por módulo
        ├── services/     # Axios con interceptores
        ├── store/        # Estado global (Zustand)
        └── App.jsx       # Rutas de la app
```

## Módulos
- Clientes
- Ventas
- Presupuestos
- Tesorería
- Gastos
- Comisiones
- Proveedores
