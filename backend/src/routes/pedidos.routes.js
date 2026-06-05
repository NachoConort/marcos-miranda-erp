const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth.middleware')
const {
  getPedidos, getPedido, crearPedido,
  editarPedido, cambiarEstado, eliminarPedido,
} = require('../controllers/pedidos.controller')

router.get('/',    protect, getPedidos)
router.get('/:id', protect, getPedido)
router.post('/',   protect, crearPedido)
router.put('/:id', protect, editarPedido)
router.patch('/:id/estado', protect, cambiarEstado)
router.delete('/:id', protect, eliminarPedido)

module.exports = router