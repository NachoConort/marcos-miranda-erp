const Cliente = require('../models/Cliente.model')

// GET /api/clientes
const getClientes = async (req, res) => {
  try {
    const { page = 1, limit = 20, busqueda, provincia, rubro, activo } = req.query
    const filtros = {}

    if (activo !== undefined) filtros.activo = activo === 'true'
    if (provincia) filtros.provincia = new RegExp(provincia, 'i')
    if (rubro) filtros.rubro = new RegExp(rubro, 'i')
    if (busqueda) {
      filtros.$or = [
        { razonSocial: new RegExp(busqueda, 'i') },
        { fantasia: new RegExp(busqueda, 'i') },
        { cuit: new RegExp(busqueda, 'i') },
        { contacto: new RegExp(busqueda, 'i') },
      ]
    }

    // Vendedor solo ve sus clientes
   if (req.user.rol === 'vendedor') {
  filtros.vendedorAlta = req.user._id
} else if (req.query.vendedorAlta) {
  filtros.vendedorAlta = req.query.vendedorAlta
}

    const clientes = await Cliente.find(filtros)
      .populate('vendedorAlta', 'nombre')
      .populate('representaciones.representacion', 'nombre')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Cliente.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), clientes })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/clientes/:id
const getCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
      .populate('vendedorAlta', 'nombre email')
      .populate('representaciones.representacion', 'nombre razonSocial')

    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' })

    res.json({ success: true, cliente })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/clientes
const crearCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create({
      ...req.body,
      vendedorAlta: req.user._id,
    })

    const clientePopulado = await Cliente.findById(cliente._id)
      .populate('vendedorAlta', 'nombre')
      .populate('representaciones.representacion', 'nombre')

    res.status(201).json({ success: true, cliente: clientePopulado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/clientes/:id
const editarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('vendedorAlta', 'nombre')
      .populate('representaciones.representacion', 'nombre')

    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' })
    res.json({ success: true, cliente })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/clientes/:id — solo admin, desactiva en lugar de borrar
const desactivarCliente = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede desactivar clientes' })
    }
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    )
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' })
    res.json({ success: true, message: 'Cliente desactivado', cliente })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getClientes, getCliente, crearCliente, editarCliente, desactivarCliente }