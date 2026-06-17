const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth.middleware')
const Marca = require('../models/Marca.model')

// GET /api/marcas
router.get('/', protect, async (req, res) => {
  try {
    const { busqueda } = req.query
    const filtros = busqueda ? { nombre: new RegExp(busqueda, 'i') } : {}
    const marcas = await Marca.find(filtros).sort({ nombre: 1 }).limit(100)
    res.json({ success: true, marcas })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/marcas
router.post('/', protect, async (req, res) => {
  try {
    const { nombre } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' })
    }
    // Verificar si ya existe
    const existe = await Marca.findOne({ nombre: new RegExp(`^${nombre.trim()}$`, 'i') })
    if (existe) {
      return res.status(400).json({ success: false, message: 'Ya existe una marca con ese nombre' })
    }
    const marca = await Marca.create({ nombre: nombre.trim(), creadoPor: req.user._id })
    res.status(201).json({ success: true, marca })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE /api/marcas/:id — solo admin
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede eliminar marcas' })
    }
    await Marca.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Marca eliminada' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router