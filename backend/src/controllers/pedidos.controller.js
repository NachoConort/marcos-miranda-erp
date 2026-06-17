const Pedido = require('../models/Pedido.model')
const Presupuesto = require('../models/Presupuesto.model')
const PermisoVendedor = require('../models/PermisoVendedor.model')

const calcularTotalesPedido = (items, descuentoGlobal = 0, tipoFacturacion = 'facturado', porcentajeIva = 21) => {
  // Subtotal bruto (sin descuentos de items)
  const subtotalBruto = items.reduce((acc, item) =>
    acc + Number(item.precioUnitario) * Number(item.cantidad), 0)

  // Descuentos por item
  const itemsCalculados = items.map((item) => {
    const subtotal = Number(item.precioUnitario) * Number(item.cantidad)
    const descuentoItem = Number(item.descuento) || 0
    const subtotalConDescuento = subtotal * (1 - descuentoItem / 100)
    return {
      ...item,
      descuento: Math.min(descuentoItem, 100), // límite 100%
      subtotal: Math.round(subtotal * 100) / 100,
      subtotalConDescuento: Math.round(subtotalConDescuento * 100) / 100,
    }
  })

  // Suma después de descuentos por item
  const subtotalTrasItems = itemsCalculados.reduce((acc, i) => acc + i.subtotalConDescuento, 0)

  // Descuento global (límite 100%)
  const descGlobal = Math.min(Number(descuentoGlobal) || 0, 100)
  const subtotalNeto = subtotalTrasItems * (1 - descGlobal / 100)

  // Total descuentos
  const totalDescuentos = subtotalBruto - subtotalNeto

  // IVA solo si es facturado
  const totalIva = tipoFacturacion === 'facturado'
    ? Math.round(subtotalNeto * (porcentajeIva / 100) * 100) / 100
    : 0

  const total = Math.round((subtotalNeto + totalIva) * 100) / 100

  return {
    itemsCalculados,
    subtotalBruto: Math.round(subtotalBruto * 100) / 100,
    totalDescuentos: Math.round(totalDescuentos * 100) / 100,
    subtotalNeto: Math.round(subtotalNeto * 100) / 100,
    totalIva,
    total,
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
      .populate('cliente', 'nombre razonSocial fantasia')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre fantasia')
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
      .populate('cliente', 'nombre razonSocial fantasia cuit condicionIva')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre fantasia')
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
      tipoFacturacion = 'facturado', porcentajeIva = 21,
      notas, presupuestoOrigen,
    } = req.body

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

    const { itemsCalculados, subtotalBruto, totalDescuentos, subtotalNeto, totalIva, total } =
      calcularTotalesPedido(items, descuentoGlobal, tipoFacturacion, porcentajeIva)

    const pedido = await Pedido.create({
      vendedor: req.user._id,
      cliente,
      representacion,
      presupuestoOrigen,
      tipoFacturacion,
      porcentajeIva,
      items: itemsCalculados,
      descuentoGlobal: Math.min(Number(descuentoGlobal), 100),
      subtotalBruto,
      totalDescuentos,
      subtotalNeto,
      totalIva,
      total,
      notas,
    })

    if (presupuestoOrigen) {
      await Presupuesto.findByIdAndUpdate(presupuestoOrigen, {
        estado: 'convertido',
        pedidoGenerado: pedido._id,
      })
    }

    const pedidoPopulado = await Pedido.findById(pedido._id)
      .populate('cliente', 'nombre razonSocial fantasia')
      .populate('representacion', 'nombre fantasia')

    res.status(201).json({ success: true, pedido: pedidoPopulado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/pedidos/:id
const editarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (!['pendiente', 'enviado'].includes(pedido.estado)) {
      return res.status(400).json({ success: false, message: 'No se puede editar este pedido' })
    }

    const { items, descuentoGlobal = 0, tipoFacturacion, porcentajeIva, notas } = req.body
    const { itemsCalculados, subtotalBruto, totalDescuentos, subtotalNeto, totalIva, total } =
      calcularTotalesPedido(
        items,
        descuentoGlobal,
        tipoFacturacion || pedido.tipoFacturacion,
        porcentajeIva || pedido.porcentajeIva
      )

    pedido.items = itemsCalculados
    pedido.descuentoGlobal = Math.min(Number(descuentoGlobal), 100)
    pedido.tipoFacturacion = tipoFacturacion || pedido.tipoFacturacion
    pedido.porcentajeIva = porcentajeIva || pedido.porcentajeIva
    pedido.subtotalBruto = subtotalBruto
    pedido.totalDescuentos = totalDescuentos
    pedido.subtotalNeto = subtotalNeto
    pedido.totalIva = totalIva
    pedido.total = total
    pedido.notas = notas
    await pedido.save()

    res.json({ success: true, pedido })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PATCH /api/pedidos/:id/estado — ya no permite borrar, solo cancelar
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body
    const pedido = await Pedido.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (pedido.estado === 'completado') {
      return res.status(400).json({ success: false, message: 'No se puede modificar un pedido completado' })
    }
    if (pedido.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'El pedido ya está cancelado' })
    }

    pedido.estado = estado
    await pedido.save()
    res.json({ success: true, pedido })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE deshabilitado — se usa cancelar en su lugar
const eliminarPedido = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Los pedidos no se pueden eliminar. Usá la opción Cancelar.',
  })
}

module.exports = { getPedidos, getPedido, crearPedido, editarPedido, cambiarEstado, eliminarPedido }