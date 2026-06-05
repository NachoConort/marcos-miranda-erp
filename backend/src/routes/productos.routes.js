const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getProductos, getProducto, crearProducto,
  editarProducto, toggleHabilitado, eliminarProducto,
} = require('../controllers/productos.controller')

router.get('/',    protect, getProductos)
router.get('/:id', protect, getProducto)
router.post('/',   protect, crearProducto)
router.put('/:id', protect, editarProducto)
router.patch('/:id/habilitar', protect, toggleHabilitado)
router.delete('/:id', protect, authorize('admin'), eliminarProducto)

module.exports = router