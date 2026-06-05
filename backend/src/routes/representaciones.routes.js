const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getRepresentaciones, getRepresentacion,
  crearRepresentacion, editarRepresentacion, desactivarRepresentacion,
} = require('../controllers/representaciones.controller')

router.get('/',    protect, getRepresentaciones)
router.get('/:id', protect, getRepresentacion)
router.post('/',   protect, authorize('admin'), crearRepresentacion)
router.put('/:id', protect, authorize('admin'), editarRepresentacion)
router.delete('/:id', protect, authorize('admin'), desactivarRepresentacion)

module.exports = router