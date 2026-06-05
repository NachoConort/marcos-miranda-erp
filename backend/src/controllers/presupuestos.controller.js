const Presupuesto = require('../models/Presupuesto.model')
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

const calcularMontoComision = (total, porcentaje, tipo) => {
  if (tipo === 'con_factura') return Math.round((total / 1.21) * (porcentaje / 100) * 100) / 100
  return Math.round(total * (porcentaje / 100) * 100) / 100
}

// GET /api/presupuestos
const getPresupuestos = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, cliente, representacion, fechaDesde, fechaHasta } = req.query
    const filtros = {}

    if (req.user.rol === 'vendedor') filtros.vendedor = req.user._id
    if (estado) filtros.estado = estado
    if (cliente) filtros.cliente = cliente
    if (representacion) filtros.representacion = representacion
    if (fechaDesde || fechaHasta) {
      filtros.fechaComprobante = {}
      if (fechaDesde) filtros.fechaComprobante.$gte = new Date(fechaDesde)
      if (fechaHasta) filtros.fechaComprobante.$lte = new Date(fechaHasta)
    }

    const presupuestos = await Presupuesto.find(filtros)
      .populate('cliente', 'nombre razonSocial fantasia')
      .populate('vendedor', 'nombre')
      .populate('representacion', 'nombre fantasia')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await Presupuesto.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), presupuestos })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/presupuestos/:id
const getPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findById(req.params.id)
      .populate('cliente', 'nombre razonSocial fantasia cuit condicionIva direccion')
      .populate('vendedor', 'nombre email')
      .populate('representacion', 'nombre fantasia razonSocial')
      .populate('listaPrecios', 'nombre')
      .populate('pedidoGenerado', 'numero estado')

    if (!presupuesto) return res.status(404).json({ success: false, message: 'No encontrado' })
    res.json({ success: true, presupuesto })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/presupuestos/comisiones-default — devuelve las comisiones configuradas para precargar
const getComisionesDefault = async (req, res) => {
  try {
    const { representacion } = req.query
    if (!representacion) return res.json({ success: true, comisionVendedor: null, comisionRepresentacion: null })

    const config = await ConfigComision.findOne({
      vendedor: req.user._id,
      representacion,
    })

    res.json({
      success: true,
      comisionVendedor: config
        ? { porcentaje: config.porcentaje, tipo: config.tipo }
        : { porcentaje: 0, tipo: 'con_factura' },
      // La comisión de la representación por ahora es igual a la del vendedor
      // se puede ajustar si en el futuro hay una config separada
      comisionRepresentacion: config
        ? { porcentaje: config.porcentaje, tipo: config.tipo }
        : { porcentaje: 0, tipo: 'con_factura' },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/presupuestos
const crearPresupuesto = async (req, res) => {
  try {
    const {
      cliente, representacion, items, descuentoGlobal = 0,
      comprobante, fechaComprobante, estado = 'borrador',
      comisionRepresentacion, comisionVendedor,
      personal, observaciones, validezDias = 30,
      listaPrecios,
    } = req.body

    const itemsCalculados = calcularItems(items)
    const { subtotal, total } = calcularTotales(itemsCalculados, descuentoGlobal)

    // Calcular montos de comisión
    const comRepresentacion = {
      ...comisionRepresentacion,
      monto: calcularMontoComision(total, comisionRepresentacion?.porcentaje || 0, comisionRepresentacion?.tipo || 'con_factura'),
    }
    const comVendedor = {
      ...comisionVendedor,
      monto: calcularMontoComision(total, comisionVendedor?.porcentaje || 0, comisionVendedor?.tipo || 'con_factura'),
    }

    const presupuesto = await Presupuesto.create({
      vendedor: req.user._id,
      cliente,
      representacion,
      listaPrecios,
      fechaComprobante: fechaComprobante || new Date(),
      items: itemsCalculados,
      descuentoGlobal,
      subtotal,
      total,
      comprobante: comprobante || null,
      estado,
      comisionRepresentacion: comRepresentacion,
      comisionVendedor: comVendedor,
      personal,
      observaciones,
      validezDias,
    })

    const presupuestoPopulado = await Presupuesto.findById(presupuesto._id)
      .populate('cliente', 'nombre razonSocial')
      .populate('representacion', 'fantasia')
      .populate('vendedor', 'nombre')

    res.status(201).json({ success: true, presupuesto: presupuestoPopulado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PUT /api/presupuestos/:id
const editarPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findById(req.params.id)
    if (!presupuesto) return res.status(404).json({ success: false, message: 'No encontrado' })
    if (presupuesto.estado === 'convertido') {
      return res.status(400).json({ success: false, message: 'No se puede editar un presupuesto convertido' })
    }

    const { items, descuentoGlobal = 0, comisionRepresentacion, comisionVendedor } = req.body
    let updateData = { ...req.body }

    if (items?.length > 0) {
      const itemsCalculados = calcularItems(items)
      const { subtotal, total } = calcularTotales(itemsCalculados, descuentoGlobal)
      updateData.items = itemsCalculados
      updateData.subtotal = subtotal
      updateData.total = total

      if (comisionRepresentacion) {
        updateData.comisionRepresentacion = {
          ...comisionRepresentacion,
          monto: calcularMontoComision(total, comisionRepresentacion.porcentaje || 0, comisionRepresentacion.tipo),
        }
      }
      if (comisionVendedor) {
        updateData.comisionVendedor = {
          ...comisionVendedor,
          monto: calcularMontoComision(total, comisionVendedor.porcentaje || 0, comisionVendedor.tipo),
        }
      }
    }

    const actualizado = await Presupuesto.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('cliente', 'nombre razonSocial')
      .populate('representacion', 'fantasia')
      .populate('vendedor', 'nombre')

    res.json({ success: true, presupuesto: actualizado })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// PATCH /api/presupuestos/:id/estado
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body
    const presupuesto = await Presupuesto.findById(req.params.id)
    if (!presupuesto) return res.status(404).json({ success: false, message: 'No encontrado' })
    if (presupuesto.estado === 'convertido') {
      return res.status(400).json({ success: false, message: 'No se puede cambiar el estado de un presupuesto convertido' })
    }

    presupuesto.estado = estado
    await presupuesto.save()
    res.json({ success: true, presupuesto })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/presupuestos/:id
const eliminarPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findById(req.params.id)
    if (!presupuesto) return res.status(404).json({ success: false, message: 'No encontrado' })
    if (presupuesto.estado === 'convertido') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar un presupuesto convertido' })
    }

    await presupuesto.deleteOne()
    res.json({ success: true, message: 'Presupuesto eliminado' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  getPresupuestos, getPresupuesto, getComisionesDefault,
  crearPresupuesto, editarPresupuesto, cambiarEstado, eliminarPresupuesto,
}