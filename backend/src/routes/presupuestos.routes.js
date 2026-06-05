const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth.middleware')
const {
  getPresupuestos, getPresupuesto, getComisionesDefault,
  crearPresupuesto, editarPresupuesto, cambiarEstado, eliminarPresupuesto,
} = require('../controllers/presupuestos.controller')

router.get('/comisiones-default', protect, getComisionesDefault)
router.get('/',    protect, getPresupuestos)
router.get('/:id', protect, getPresupuesto)
router.post('/',   protect, crearPresupuesto)
router.put('/:id', protect, editarPresupuesto)
router.patch('/:id/estado', protect, cambiarEstado)
router.delete('/:id', protect, eliminarPresupuesto)

module.exports = router
