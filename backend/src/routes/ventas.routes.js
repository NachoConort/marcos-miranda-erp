const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getVentas, getVenta, crearVenta,
  agregarCobranza, cancelarVenta, eliminarVenta,
} = require('../controllers/ventas.controller')

router.get('/',    protect, getVentas)
router.get('/:id', protect, getVenta)
router.post('/',   protect, crearVenta)
router.post('/:id/cobranzas', protect, agregarCobranza)
router.patch('/:id/cancelar', protect, cancelarVenta)
router.delete('/:id', protect, authorize('admin'), eliminarVenta)

module.exports = router
