const Venta = require('../models/Venta.model')
const Pedido = require('../models/Pedido.model')
const Comision = require('../models/Comision.model')
const ConfigComision = require('../models/ConfigComision.model')

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

// GET /api/ventas
const getVentas = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      estado, vendedor, representacion, cliente,
      fechaDesde, fechaHasta,
      tipoComprobante, letraComprobante, puntoVenta, numeroComprobante,
      validacionAfip, condicionPago, cobroPendiente,
      estadoRemito, provincia, formaPago,
    } = req.query

    const filtros = {}
    if (req.user.rol === 'vendedor') filtros.vendedor = req.user._id
    else if (vendedor) filtros.vendedor = vendedor
    if (estado) filtros.estado = estado
    if (representacion) filtros.representacion = representacion
    if (cliente) filtros.cliente = cliente
    if (condicionPago) filtros.condicionPago = condicionPago
    if (estadoRemito) filtros.estadoRemito = estadoRemito
    if (provincia) filtros.provincia = provincia
    if (cobroPendiente !== undefined) filtros.cobroPendiente = cobroPendiente === 'true'
    if (tipoComprobante) filtros['comprobante.tipo'] = tipoComprobante
    if (letraComprobante) filtros['comprobante.letra'] = letraComprobante
    if (puntoVenta) filtros['comprobante.puntoVenta'] = Number(puntoVenta)
    if (numeroComprobante) filtros['comprobante.numero'] = Number(numeroComprobante)
    if (validacionAfip) filtros['comprobante.validacionAfip'] = validacionAfip
    if (fechaDesde || fechaHasta) {
      filtros.createdAt = {}
      if (fechaDesde) filtros.createdAt.$gte = new Date(fechaDesde)
      if (fechaHasta) filtros.createdAt.$lte = new Date(fechaHasta)
    }

    const ventas = await Venta.find(filtros)
      .populate('cliente', 'nombre razonSocial cuit')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre')
      .populate('comision', 'montoComision estado tipo porcentaje')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Venta.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), ventas })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/ventas/:id
const getVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('cliente', 'nombre razonSocial cuit condicionIva direccion')
      .populate('vendedor', 'nombre email')
      .populate('representacion', 'nombre razonSocial')
      .populate('comision')
      .populate('pedidoOrigen', 'numero')
      .populate('presupuestoOrigen', 'numero')

    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' })

    if (req.user.rol === 'vendedor' && venta.vendedor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Sin permiso' })
    }

    res.json({ success: true, venta })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/ventas — el representante crea la venta con el comprobante
const crearVenta = async (req, res) => {
  try {
    const {
      cliente, representacion, items, descuentoGlobal = 0,
      comprobante, cobranzas = [],
      condicionPago, fechaVencimientoPago,
      cobrador, estadoRemito, provincia,
      personal, integracion, notas,
      pedidoOrigen, presupuestoOrigen,
    } = req.body

    const itemsCalculados = calcularItems(items)
    const { subtotal, total } = calcularTotales(itemsCalculados, descuentoGlobal)

    // Calcular total cobrado inicial si vienen cobranzas
    const cobranzasCalculadas = cobranzas.map((c) => ({
      ...c,
      total: Math.round(Number(c.monto) * Number(c.cotizacion || 1) * 100) / 100,
    }))

    const venta = await Venta.create({
      vendedor: req.user._id,
      cliente,
      representacion,
      pedidoOrigen,
      presupuestoOrigen,
      comprobante,
      items: itemsCalculados,
      descuentoGlobal,
      subtotal,
      total,
      cobranzas: cobranzasCalculadas,
      condicionPago,
      fechaVencimientoPago,
      cobrador,
      estadoRemito: estadoRemito || 'sin_remito',
      provincia,
      personal,
      integracion,
      notas,
    })

    // Marcar pedido origen como completado
    if (pedidoOrigen) {
      await Pedido.findByIdAndUpdate(pedidoOrigen, {
        estado: 'completado',
        ventaGenerada: venta._id,
      })
    }

    // Generar comisión
    const configComision = await ConfigComision.findOne({
      vendedor: req.user._id,
      representacion,
    })

    if (configComision) {
      const montoComision = configComision.tipo === 'con_factura'
        ? (total / 1.21) * (configComision.porcentaje / 100)
        : total * (configComision.porcentaje / 100)

      const ahora = new Date()
      const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

      const comision = await Comision.create({
        vendedor: req.user._id,
        venta: venta._id,
        representacion,
        porcentaje: configComision.porcentaje,
        tipo: configComision.tipo,
        montoVenta: total,
        montoComision: Math.round(montoComision * 100) / 100,
        periodo,
      })

      await Venta.findByIdAndUpdate(venta._id, { comision: comision._id })
    }

    const ventaPopulada = await Venta.findById(venta._id)
      .populate('cliente', 'nombre razonSocial')
      .populate('representacion', 'nombre')
      .populate('comision')

    res.status(201).json({ success: true, venta: ventaPopulada })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// POST /api/ventas/:id/cobranzas — agregar un pago a una venta existente
const agregarCobranza = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' })
    if (venta.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'No se puede agregar cobranza a una venta cancelada' })
    }

    const cobranza = {
      ...req.body,
      total: Math.round(Number(req.body.monto) * Number(req.body.cotizacion || 1) * 100) / 100,
    }

    venta.cobranzas.push(cobranza)
    await venta.save() // el pre-save recalcula totalCobrado y estado

    res.json({ success: true, venta })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PATCH /api/ventas/:id/cancelar
const cancelarVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' })
    if (venta.estado === 'cobrado') {
      return res.status(400).json({ success: false, message: 'No se puede cancelar una venta cobrada' })
    }

    venta.estado = 'cancelado'
    if (venta.comision) await Comision.findByIdAndUpdate(venta.comision, { estado: 'cancelada' })
    await venta.save()

    res.json({ success: true, venta })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/ventas/:id — solo admin
const eliminarVenta = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede eliminar ventas' })
    }
    const venta = await Venta.findById(req.params.id)
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' })

    if (venta.comision) await Comision.findByIdAndDelete(venta.comision)
    await venta.deleteOne()

    res.json({ success: true, message: 'Venta eliminada' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getVentas, getVenta, crearVenta, agregarCobranza, cancelarVenta, eliminarVenta }