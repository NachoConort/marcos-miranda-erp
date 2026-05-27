const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario.model')

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body

    const existe = await Usuario.findOne({ email })
    if (existe) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' })
    }

    const usuario = await Usuario.create({ nombre, email, password, rol })
    const token = generarToken(usuario._id)

    res.status(201).json({
      success: true,
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const usuario = await Usuario.findOne({ email }).select('+password')
    if (!usuario || !(await usuario.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' })
    }

    if (!usuario.activo) {
      return res.status(403).json({ success: false, message: 'Usuario desactivado' })
    }

    const token = generarToken(usuario._id)

    res.json({
      success: true,
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/auth/me
const me = async (req, res) => {
  res.json({ success: true, usuario: req.user })
}

module.exports = { register, login, me }
