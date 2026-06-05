const express = require('express')
const { protect } = require('../middlewares/auth.middleware')

const Usuario = require('../models/Usuario.model')
const Representacion = require('../models/Representacion.model')
const Cliente = require('../models/Cliente.model')
const PermisoVendedor = require('../models/PermisoVendedor.model')
const ListaPrecios = require('../models/ListaPrecios.model')
const ConfigComision = require('../models/ConfigComision.model')
const Presupuesto = require('../models/Presupuesto.model')
const Venta = require('../models/Venta.model')
const Comision = require('../models/Comision.model')
const { Proveedor, Gasto, Movimiento } = require('../models/TesoreriaGastos.model')

const crudRouter = (Model, populateFields = []) => {
  const router = express.Router()

  router.get('/', protect, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filtros } = req.query
      const query = Model.find(filtros)
      populateFields.forEach((f) => query.populate(f))
      const items = await query.sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
      const total = await Model.countDocuments(filtros)
      res.json({ success: true, total, page: Number(page), items })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  })

  router.get('/:id', protect, async (req, res) => {
    try {
      const query = Model.findById(req.params.id)
      populateFields.forEach((f) => query.populate(f))
      const item = await query
      if (!item) return res.status(404).json({ success: false, message: 'No encontrado' })
      res.json({ success: true, item })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  })

  router.post('/', protect, async (req, res) => {
    try {
      const item = await Model.create({ ...req.body, creadoPor: req.user?._id })
      res.status(201).json({ success: true, item })
    } catch (error) {
      res.status(400).json({ success: false, message: error.message })
    }
  })

  router.put('/:id', protect, async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      if (!item) return res.status(404).json({ success: false, message: 'No encontrado' })
      res.json({ success: true, item })
    } catch (error) {
      res.status(400).json({ success: false, message: error.message })
    }
  })

  router.delete('/:id', protect, async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id)
      if (!item) return res.status(404).json({ success: false, message: 'No encontrado' })
      res.json({ success: true, message: 'Eliminado correctamente' })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  })

  return router
}

module.exports = {
  representacionesRoutes: crudRouter(Representacion),
  clientesRoutes:         crudRouter(Cliente, ['vendedor']),
  permisosRoutes:         crudRouter(PermisoVendedor, ['vendedor', 'representacion']),
  listasRoutes:           crudRouter(ListaPrecios, ['vendedor', 'representacion']),
  configComisionRoutes:   crudRouter(ConfigComision, ['vendedor', 'representacion']),
  presupuestosRoutes:     crudRouter(Presupuesto, ['vendedor', 'cliente', 'representacion']),
  comisionesRoutes:       crudRouter(Comision, ['vendedor', 'venta', 'representacion']),
  proveedoresRoutes:      crudRouter(Proveedor),
  gastosRoutes:           crudRouter(Gasto, ['proveedor', 'creadoPor']),
  movimientosRoutes:      crudRouter(Movimiento, ['creadoPor']),
}
