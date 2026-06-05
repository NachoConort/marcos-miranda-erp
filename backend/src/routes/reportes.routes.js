const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth.middleware')
const Venta = require('../models/Venta.model')
const Presupuesto = require('../models/Presupuesto.model')
const Comision = require('../models/Comision.model')
const { Gasto } = require('../models/TesoreriaGastos.model')

router.get('/dashboard', protect, async (req, res) => {
  try {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    const [ventasMes, presupuestosActivos, comisionesPendientes, gastosMes, ventasRecientes, ventasPorRepresentacion] =
      await Promise.all([
        Venta.aggregate([
          { $match: { createdAt: { $gte: inicioMes }, estado: { $ne: 'cancelado' } } },
          { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
        ]),
        Presupuesto.countDocuments({ estado: { $in: ['enviado', 'pedido'] } }),
        Comision.aggregate([
          { $match: { estado: 'pendiente' } },
          { $group: { _id: null, total: { $sum: '$montoComision' } } },
        ]),
        Gasto.aggregate([
          { $match: { createdAt: { $gte: inicioMes } } },
          { $group: { _id: null, total: { $sum: '$monto' } } },
        ]),
        Venta.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('cliente', 'nombre'),
        Venta.aggregate([
          { $match: { estado: { $ne: 'cancelado' } } },
          { $group: { _id: '$representacion', total: { $sum: '$total' } } },
          { $sort: { total: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'representacions', localField: '_id', foreignField: '_id', as: 'representacion' } },
          { $unwind: '$representacion' },
          { $project: { _id: 1, total: 1, nombre: '$representacion.nombre' } },
        ]),
      ])

    res.json({
      success: true,
      data: {
        ventasMes: ventasMes[0] || { total: 0, cantidad: 0 },
        presupuestosActivos,
        comisionesPendientes: comisionesPendientes[0]?.total || 0,
        gastosMes: gastosMes[0]?.total || 0,
        ventasRecientes,
        ventasPorEmpresa: ventasPorRepresentacion,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
