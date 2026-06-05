const Pedido = require('../models/Pedido.model')
const Presupuesto = require('../models/Presupuesto.model')
const PermisoVendedor = require('../models/PermisoVendedor.model')

const calcularItems = (items) =>
  items.map((item) => ({
    ...item,
    subtotal: Math.round(
      Number(item.precioUnitario) * Number(item.cantidad) * (1 - (Number(item.descuento) || 0) / 100) * 100
    ) / 100,
  }))

const calcularTotales = (items, descuentoGlobal = 0) => {
  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
  const total = subtotal * (1 - descuentoGlobal / 100)
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// GET /api/pedidos
const getPedidos = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado } = req.query
    const filtros = {}

    if (req.user.rol === 'vendedor') filtros.vendedor = req.user._id
    if (estado) filtros.estado = estado

    const pedidos = await Pedido.find(filtros)
      .populate('cliente', 'nombre razonSocial')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Pedido.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), pedidos })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/pedidos/:id
const getPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('cliente', 'nombre razonSocial cuit condicionIva')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre')
      .populate('presupuestoOrigen', 'numero')

    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })

    if (req.user.rol === 'vendedor' && pedido.vendedor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Sin permiso' })
    }

    res.json({ success: true, pedido })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/pedidos
const crearPedido = async (req, res) => {
  try {
    const {
      cliente, representacion, items, descuentoGlobal = 0,
      notas, presupuestoOrigen,
    } = req.body

    // Verificar permiso
    const permiso = await PermisoVendedor.findOne({
      vendedor: req.user._id,
      representacion,
      activo: true,
    })
    if (!permiso && req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tenés permiso para crear pedidos de esta representación',
      })
    }

    const itemsCalculados = calcularItems(items)
    const { subtotal, total } = calcularTotales(itemsCalculados, descuentoGlobal)

    const pedido = await Pedido.create({
      vendedor: req.user._id,
      cliente,
      representacion,
      presupuestoOrigen,
      items: itemsCalculados,
      descuentoGlobal,
      subtotal,
      total,
      notas,
    })

    // Si viene de presupuesto, marcarlo como convertido
    if (presupuestoOrigen) {
      await Presupuesto.findByIdAndUpdate(presupuestoOrigen, {
        estado: 'convertido',
        pedidoGenerado: pedido._id,
      })
    }

    const pedidoPopulado = await Pedido.findById(pedido._id)
      .populate('cliente', 'nombre')
      .populate('representacion', 'nombre')

    res.status(201).json({ success: true, pedido: pedidoPopulado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/pedidos/:id — editar pedido (solo si está pendiente)
const editarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (!['pendiente', 'enviado'].includes(pedido.estado)) {
      return res.status(400).json({ success: false, message: 'No se puede editar un pedido completado o cancelado' })
    }

    const { items, descuentoGlobal = 0, notas } = req.body
    const itemsCalculados = calcularItems(items)
    const { subtotal, total } = calcularTotales(itemsCalculados, descuentoGlobal)

    pedido.items = itemsCalculados
    pedido.descuentoGlobal = descuentoGlobal
    pedido.subtotal = subtotal
    pedido.total = total
    pedido.notas = notas
    await pedido.save()

    res.json({ success: true, pedido })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PATCH /api/pedidos/:id/estado
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body
    const pedido = await Pedido.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (pedido.estado === 'completado') {
      return res.status(400).json({ success: false, message: 'El pedido ya está completado' })
    }

    pedido.estado = estado
    await pedido.save()
    res.json({ success: true, pedido })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/pedidos/:id — solo si no está completado
const eliminarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (pedido.estado === 'completado') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar un pedido completado' })
    }

    await pedido.deleteOne()
    res.json({ success: true, message: 'Pedido eliminado' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getPedidos, getPedido, crearPedido, editarPedido, cambiarEstado, eliminarPedido }