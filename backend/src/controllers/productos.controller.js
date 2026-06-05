const Producto = require('../models/Producto.model')

// GET /api/productos
const getProductos = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      busqueda, rubro, subRubro, representacion,
      habilitado, stockeable, disponiblePara, tipoProducto,
    } = req.query

    const filtros = {}

    if (habilitado !== undefined) filtros.habilitado = habilitado === 'true'
    if (stockeable !== undefined) filtros.stockeable = stockeable === 'true'
    if (rubro) filtros.rubro = new RegExp(rubro, 'i')
    if (subRubro) filtros.subRubro = new RegExp(subRubro, 'i')
    if (tipoProducto) filtros.tipoProducto = new RegExp(tipoProducto, 'i')
    if (representacion) filtros.representaciones = representacion
    if (disponiblePara) filtros.disponiblePara = disponiblePara

    if (busqueda) {
      filtros.$or = [
        { nombre: new RegExp(busqueda, 'i') },
        { codigo: new RegExp(busqueda, 'i') },
        { codigoBarra: new RegExp(busqueda, 'i') },
        { marca: new RegExp(busqueda, 'i') },
      ]
    }

    const productos = await Producto.find(filtros)
      .populate('representaciones', 'fantasia nombre')
      .populate('creadoPor', 'nombre')
      .sort({ nombre: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Producto.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), productos })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/productos/:id
const getProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('representaciones', 'fantasia nombre')
      .populate('creadoPor', 'nombre')

    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' })
    res.json({ success: true, producto })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/productos
const crearProducto = async (req, res) => {
  try {
    const producto = await Producto.create({
      ...req.body,
      creadoPor: req.user._id,
    })

    const populado = await Producto.findById(producto._id)
      .populate('representaciones', 'fantasia nombre')

    res.status(201).json({ success: true, producto: populado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/productos/:id
const editarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('representaciones', 'fantasia nombre')

    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' })
    res.json({ success: true, producto })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PATCH /api/productos/:id/habilitar
const toggleHabilitado = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' })

    producto.habilitado = !producto.habilitado
    await producto.save()
    res.json({ success: true, producto })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/productos/:id — solo admin
const eliminarProducto = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede eliminar productos' })
    }
    const producto = await Producto.findByIdAndDelete(req.params.id)
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' })
    res.json({ success: true, message: 'Producto eliminado' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getProductos, getProducto, crearProducto, editarProducto, toggleHabilitado, eliminarProducto }