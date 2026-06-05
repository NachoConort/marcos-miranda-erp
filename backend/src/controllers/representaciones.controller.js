const Representacion = require('../models/Representacion.model')
const ListaPrecios = require('../models/ListaPrecios.model')
const ConfigComision = require('../models/ConfigComision.model')

// GET /api/representaciones
const getRepresentaciones = async (req, res) => {
  try {
    const { page = 1, limit = 20, busqueda, activa } = req.query
    const filtros = {}

    if (activa !== undefined) filtros.activa = activa === 'true'
    if (busqueda) {
      filtros.$or = [
        { fantasia: new RegExp(busqueda, 'i') },
        { razonSocial: new RegExp(busqueda, 'i') },
        { cuit: new RegExp(busqueda, 'i') },
      ]
    }

    const representaciones = await Representacion.find(filtros)
      .sort({ fantasia: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Representacion.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), items: representaciones })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/representaciones/:id
const getRepresentacion = async (req, res) => {
  try {
    const representacion = await Representacion.findById(req.params.id)
    if (!representacion) return res.status(404).json({ success: false, message: 'No encontrada' })

    // Traer listas de precio y configuraciones de comisión asociadas
    const [listas, comisiones] = await Promise.all([
      ListaPrecios.find({ representacion: req.params.id, activa: true })
        .populate('vendedor', 'nombre'),
      ConfigComision.find({ representacion: req.params.id })
        .populate('vendedor', 'nombre'),
    ])

    res.json({ success: true, representacion, listas, comisiones })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/representaciones
const crearRepresentacion = async (req, res) => {
  try {
    const representacion = await Representacion.create(req.body)
    res.status(201).json({ success: true, representacion })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/representaciones/:id
const editarRepresentacion = async (req, res) => {
  try {
    const representacion = await Representacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!representacion) return res.status(404).json({ success: false, message: 'No encontrada' })
    res.json({ success: true, representacion })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/representaciones/:id — solo admin, desactiva
const desactivarRepresentacion = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede desactivar representaciones' })
    }
    const representacion = await Representacion.findByIdAndUpdate(
      req.params.id,
      { activa: false },
      { new: true }
    )
    if (!representacion) return res.status(404).json({ success: false, message: 'No encontrada' })
    res.json({ success: true, message: 'Representación desactivada', representacion })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  getRepresentaciones, getRepresentacion,
  crearRepresentacion, editarRepresentacion, desactivarRepresentacion,
}