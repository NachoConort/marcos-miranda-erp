const express = require('express')
const { protect } = require('../middlewares/auth.middleware')
const Cliente = require('../models/Cliente.model')
const Venta = require('../models/Venta.model')
const Presupuesto = require('../models/Presupuesto.model')
const Movimiento = require('../models/Movimiento.model')
const { Gasto, Proveedor, Comision } = require('../models/otros.models')

// Fábrica de router CRUD para cualquier modelo
const crudRouter = (Model, populateFields = []) => {
  const router = express.Router()

  // GET todos
  router.get('/', protect, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filtros } = req.query
      const query = Model.find(filtros)
      populateFields.forEach((f) => query.populate(f))
      const items = await query
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
      const total = await Model.countDocuments(filtros)
      res.json({ success: true, total, page: Number(page), items })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  })

  // GET uno por ID
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

  // POST crear
  router.post('/', protect, async (req, res) => {
    try {
      const item = await Model.create({ ...req.body, creadoPor: req.user?._id })
      res.status(201).json({ success: true, item })
    } catch (error) {
      res.status(400).json({ success: false, message: error.message })
    }
  })

  // PUT actualizar
  router.put('/:id', protect, async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
      if (!item) return res.status(404).json({ success: false, message: 'No encontrado' })
      res.json({ success: true, item })
    } catch (error) {
      res.status(400).json({ success: false, message: error.message })
    }
  })

  // DELETE eliminar
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

// Exportar un router por módulo
module.exports = {
  clientesRoutes: crudRouter(Cliente, ['vendedorAsignado']),
  ventasRoutes: crudRouter(Venta, ['cliente', 'vendedor']),
  presupuestosRoutes: crudRouter(Presupuesto, ['cliente', 'vendedor']),
  tesoreraRoutes: crudRouter(Movimiento, ['creadoPor']),
  gastosRoutes: crudRouter(Gasto, ['proveedor', 'creadoPor']),
  proveedoresRoutes: crudRouter(Proveedor),
  comisionesRoutes: crudRouter(Comision, ['vendedor', 'venta']),
}
