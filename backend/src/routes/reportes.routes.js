const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth.middleware')
const Venta = require('../models/Venta.model')
const { Gasto } = require('../models/otros.models')

// GET /api/reportes/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    const [totalVentasMes, totalGastosMes, ventasRecientes] = await Promise.all([
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioMes }, estado: { $ne: 'cancelada' } } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
      Gasto.aggregate([
        { $match: { createdAt: { $gte: inicioMes } } },
        { $group: { _id: null, total: { $sum: '$monto' } } },
      ]),
      Venta.find().sort({ createdAt: -1 }).limit(5).populate('cliente', 'nombre'),
    ])

    res.json({
      success: true,
      data: {
        ventasMes: totalVentasMes[0] || { total: 0, cantidad: 0 },
        gastosMes: totalGastosMes[0]?.total || 0,
        ventasRecientes,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
