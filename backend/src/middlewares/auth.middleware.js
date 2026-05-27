const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario.model')

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No autorizado, token requerido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = await Usuario.findById(decoded.id).select('-password')
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' })
    }

    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
  }
}

// Middleware para verificar roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol '${req.user.rol}' no tiene permiso para esta acción`,
      })
    }
    next()
  }
}

module.exports = { protect, authorize }
