const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getCajas, getCajaHoy, getCaja,
  abrirCaja, agregarMovimiento, eliminarMovimiento, cerrarCaja,
} = require('../controllers/caja.controller')

router.get('/',           protect, getCajas)
router.get('/hoy',        protect, getCajaHoy)
router.get('/:id',        protect, getCaja)
router.post('/abrir',     protect, abrirCaja)
router.post('/:id/movimientos', protect, agregarMovimiento)
router.delete('/:cajaId/movimientos/:movId', protect, authorize('admin'), eliminarMovimiento)
router.patch('/:id/cerrar', protect, authorize('admin'), cerrarCaja)

module.exports = router