require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const connectDB = require('./config/database')

const app = express()
connectDB()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.use('/api/auth',              require('./routes/auth.routes'))
app.use('/api/representaciones',  require('./routes/representaciones.routes'))
app.use('/api/clientes',          require('./routes/clientes.routes'))
app.use('/api/permisos',          require('./routes/permisos.routes'))
app.use('/api/listas-precios',    require('./routes/listas.routes'))
app.use('/api/config-comision',   require('./routes/config-comision.routes'))
app.use('/api/productos',         require('./routes/productos.routes'))
app.use('/api/presupuestos',      require('./routes/presupuestos.routes'))
app.use('/api/pedidos',           require('./routes/pedidos.routes'))
app.use('/api/ventas',            require('./routes/ventas.routes'))
app.use('/api/comisiones',        require('./routes/comisiones.routes'))
app.use('/api/proveedores',       require('./routes/proveedores.routes'))
app.use('/api/gastos',            require('./routes/gastos.routes'))
app.use('/api/movimientos',       require('./routes/movimientos.routes'))
app.use('/api/reportes',          require('./routes/reportes.routes'))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`))