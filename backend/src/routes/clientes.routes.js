const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getClientes, getCliente, crearCliente, editarCliente, desactivarCliente,
} = require('../controllers/clientes.controller')

router.get('/',    protect, getClientes)
router.get('/:id', protect, getCliente)
router.post('/',   protect, crearCliente)
router.put('/:id', protect, editarCliente)
router.delete('/:id', protect, authorize('admin'), desactivarCliente)

module.exports = router
