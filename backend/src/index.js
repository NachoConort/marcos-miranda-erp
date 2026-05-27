require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const connectDB = require('./config/database')

// Rutas
const authRoutes = require('./routes/auth.routes')
const clientesRoutes = require('./routes/clientes.routes')
const ventasRoutes = require('./routes/ventas.routes')
const presupuestosRoutes = require('./routes/presupuestos.routes')
const tesoreraRoutes = require('./routes/tesoreria.routes')
const gastosRoutes = require('./routes/gastos.routes')
const comisionesRoutes = require('./routes/comisiones.routes')
const proveedoresRoutes = require('./routes/proveedores.routes')
const reportesRoutes = require('./routes/reportes.routes')

const app = express()

// Conectar a la base de datos
connectDB()

// Middlewares globales
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Rutas de la API
app.use('/api/auth', authRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/ventas', ventasRoutes)
app.use('/api/presupuestos', presupuestosRoutes)
app.use('/api/tesoreria', tesoreraRoutes)
app.use('/api/gastos', gastosRoutes)
app.use('/api/comisiones', comisionesRoutes)
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/reportes', reportesRoutes)

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ERP API funcionando correctamente' })
})

// Middleware de errores global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
