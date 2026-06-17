const CajaDiaria = require('../models/CajaDiaria.model')

// Recalcular saldos de todos los movimientos de una caja
const recalcularSaldos = (saldoInicial, movimientos) => {
  let saldoAcumulado = saldoInicial
  return movimientos.map((mov) => {
    if (mov.tipo === 'ingreso') saldoAcumulado += mov.monto
    else saldoAcumulado -= mov.monto
    return { ...mov.toObject?.() ?? mov, saldo: Math.round(saldoAcumulado * 100) / 100 }
  })
}

// GET /api/caja — listar cajas (historial)
const getCajas = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado } = req.query
    const filtros = {}
    if (estado) filtros.estado = estado

    const cajas = await CajaDiaria.find(filtros)
      .populate('cerradaPor', 'nombre')
      .sort({ fecha: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await CajaDiaria.countDocuments(filtros)
    res.json({ success: true, total, page: Number(page), cajas })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/caja/hoy — caja del día actual (o la última abierta)
const getCajaHoy = async (req, res) => {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    let caja = await CajaDiaria.findOne({
      fecha: { $gte: hoy, $lt: manana },
    }).populate('movimientos.creadoPor', 'nombre')
      .populate('cerradaPor', 'nombre')

    // Si no existe caja hoy, buscar la última cerrada para tomar su saldo final
    if (!caja) {
      const ultima = await CajaDiaria.findOne({ estado: 'cerrada' }).sort({ fecha: -1 })
      return res.json({
        success: true,
        caja: null,
        saldoSugerido: ultima?.saldoFinal ?? 0,
        ultimaCaja: ultima ? {
          fecha: ultima.fecha,
          saldoFinal: ultima.saldoFinal,
        } : null,
      })
    }

    res.json({ success: true, caja })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/caja/:id
const getCaja = async (req, res) => {
  try {
    const caja = await CajaDiaria.findById(req.params.id)
      .populate('movimientos.creadoPor', 'nombre')
      .populate('cerradaPor', 'nombre')

    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' })
    res.json({ success: true, caja })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// POST /api/caja/abrir — abrir caja del día
const abrirCaja = async (req, res) => {
  try {
    const { saldoInicial = 0 } = req.body

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    // Verificar que no haya ya una caja abierta hoy
    const yaExiste = await CajaDiaria.findOne({ fecha: { $gte: hoy, $lt: manana } })
    if (yaExiste) {
      return res.status(400).json({ success: false, message: 'Ya existe una caja para hoy' })
    }

    const caja = await CajaDiaria.create({
      fecha: hoy,
      saldoInicial: Number(saldoInicial),
      movimientos: [],
      estado: 'abierta',
    })

    res.status(201).json({ success: true, caja })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// POST /api/caja/:id/movimientos — agregar movimiento
const agregarMovimiento = async (req, res) => {
  try {
    const caja = await CajaDiaria.findById(req.params.id)
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' })
    if (caja.estado === 'cerrada') {
      return res.status(400).json({ success: false, message: 'No se pueden agregar movimientos a una caja cerrada' })
    }

    const { concepto, detalle, tipo, monto, origen = 'manual', referenciaId } = req.body

    if (!concepto || !tipo || !monto) {
      return res.status(400).json({ success: false, message: 'Concepto, tipo y monto son requeridos' })
    }

    // Calcular saldo actual
    const saldoActual = caja.movimientos.length > 0
      ? caja.movimientos[caja.movimientos.length - 1].saldo
      : caja.saldoInicial

    const nuevoSaldo = tipo === 'ingreso'
      ? saldoActual + Number(monto)
      : saldoActual - Number(monto)

    caja.movimientos.push({
      concepto,
      detalle,
      tipo,
      monto: Number(monto),
      saldo: Math.round(nuevoSaldo * 100) / 100,
      origen,
      referenciaId,
      creadoPor: req.user._id,
    })

    await caja.save()
    await caja.populate('movimientos.creadoPor', 'nombre')

    res.status(201).json({ success: true, caja })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// DELETE /api/caja/:cajaId/movimientos/:movId — eliminar movimiento (solo admin)
const eliminarMovimiento = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede eliminar movimientos' })
    }

    const caja = await CajaDiaria.findById(req.params.cajaId)
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' })
    if (caja.estado === 'cerrada') {
      return res.status(400).json({ success: false, message: 'No se puede modificar una caja cerrada' })
    }

    caja.movimientos = caja.movimientos.filter(
      (m) => m._id.toString() !== req.params.movId
    )

    // Recalcular todos los saldos tras eliminar
    const recalculados = recalcularSaldos(caja.saldoInicial, caja.movimientos)
    caja.movimientos = recalculados

    await caja.save()
    res.json({ success: true, caja })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// PATCH /api/caja/:id/cerrar — cerrar caja (solo admin)
const cerrarCaja = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el admin puede cerrar la caja' })
    }

    const caja = await CajaDiaria.findById(req.params.id)
    if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' })
    if (caja.estado === 'cerrada') {
      return res.status(400).json({ success: false, message: 'La caja ya está cerrada' })
    }

    const { observacionCierre } = req.body

    // Saldo final = último saldo de los movimientos, o saldo inicial si no hay movimientos
    const saldoFinal = caja.movimientos.length > 0
      ? caja.movimientos[caja.movimientos.length - 1].saldo
      : caja.saldoInicial

    caja.estado = 'cerrada'
    caja.saldoFinal = saldoFinal
    caja.cerradaPor = req.user._id
    caja.fechaCierre = new Date()
    caja.observacionCierre = observacionCierre

    await caja.save()
    await caja.populate('cerradaPor', 'nombre')

    res.json({ success: true, caja })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = {
  getCajas, getCajaHoy, getCaja,
  abrirCaja, agregarMovimiento, eliminarMovimiento, cerrarCaja,
}