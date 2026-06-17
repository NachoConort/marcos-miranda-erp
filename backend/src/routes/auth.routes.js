const express = require('express')
const router = express.Router()
const { register, login, me } = require('../controllers/auth.controller')
const { protect, authorize } = require('../middlewares/auth.middleware')
const Usuario = require('../models/Usuario.model')

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, me)

// Listar usuarios (para selects)
router.get('/usuarios', protect, async (req, res) => {
  try {
    const { limit = 100 } = req.query
    const usuarios = await Usuario.find({ activo: true })
      .select('nombre email rol')
      .limit(Number(limit))
      .sort({ nombre: 1 })
    res.json({ success: true, usuarios })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router