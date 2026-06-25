const Producto = require('../models/Producto.model')
const Marca = require('../models/Marca.model')
const XLSX = require('xlsx')
const Representacion = require('../models/Representacion.model')
const ImportacionExcel = require('../models/ImportacionExcel.model')

// GET /api/productos
const getProductos = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      busqueda, rubro, subRubro, representacion,
      habilitado, marca,
    } = req.query

    const filtros = {}
    if (habilitado !== undefined) filtros.habilitado = habilitado === 'true'
    if (rubro) filtros.rubro = new RegExp(rubro, 'i')
    if (subRubro) filtros.subRubro = new RegExp(subRubro, 'i')
    if (representacion) filtros.representaciones = representacion
    if (marca) filtros.marca = marca
    if (busqueda) {
      filtros.$or = [
        { nombre: new RegExp(busqueda, 'i') },
        { codigo: new RegExp(busqueda, 'i') },
        { codigoBarra: new RegExp(busqueda, 'i') },
      ]
    }

    const productos = await Producto.find(filtros)
      .populate('representaciones', 'fantasia nombre')
      .populate('marca', 'nombre')
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
      .populate('marca', 'nombre')
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
      disponiblePara: ['ventas'],
      creadoPor: req.user._id,
    })
    const populado = await Producto.findById(producto._id)
      .populate('representaciones', 'fantasia nombre')
      .populate('marca', 'nombre')
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
      { ...req.body, disponiblePara: ['ventas'] },
      { new: true, runValidators: true }
    )
      .populate('representaciones', 'fantasia nombre')
      .populate('marca', 'nombre')
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

// DELETE /api/productos/:id
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

// Valores válidos permitidos — única fuente de verdad
const IVA_VALIDOS = [0, 10.5, 21, 27]
const MONEDAS_VALIDAS = ['pesos', 'dolar']
const BOOL_VALIDOS = ['si', 'no']

// Convierte y valida un valor booleano tipo "si"/"no"
const parseBool = (valor, nombreCampo, errores, opcional = true) => {
  const texto = String(valor ?? '').trim().toLowerCase()
  if (texto === '') {
    if (opcional) return false
    errores.push(`el campo '${nombreCampo}' es requerido`)
    return null
  }
  if (!BOOL_VALIDOS.includes(texto)) {
    errores.push(`'${nombreCampo}' tiene un valor inválido ("${valor}"). Debe ser "si" o "no"`)
    return null
  }
  return texto === 'si'
}

// Convierte y valida un número dentro de una lista cerrada de opciones válidas
const parseEnumNumerico = (valor, nombreCampo, opcionesValidas, errores, valorPorDefecto = null) => {
  const texto = String(valor ?? '').trim()
  if (texto === '') {
    if (valorPorDefecto !== null) return valorPorDefecto
    errores.push(`el campo '${nombreCampo}' es requerido`)
    return null
  }
  const numero = Number(texto.replace(',', '.'))
  if (isNaN(numero)) {
    errores.push(`'${nombreCampo}' debe ser un número (se recibió "${valor}")`)
    return null
  }
  if (!opcionesValidas.includes(numero)) {
    errores.push(
      `'${nombreCampo}' tiene un valor no permitido (${numero}). Valores válidos: ${opcionesValidas.join(', ')}`
    )
    return null
  }
  return numero
}

// Convierte y valida un número decimal libre (costo, cantidad) — no de lista cerrada
const parseNumero = (valor, nombreCampo, errores, { permitirNegativo = false, opcional = true, porDefecto = 0 } = {}) => {
  const texto = String(valor ?? '').trim()
  if (texto === '') {
    if (opcional) return porDefecto
    errores.push(`el campo '${nombreCampo}' es requerido`)
    return null
  }
  const numero = Number(texto.replace(',', '.'))
  if (isNaN(numero)) {
    errores.push(`'${nombreCampo}' debe ser un número (se recibió "${valor}")`)
    return null
  }
  if (!permitirNegativo && numero < 0) {
    errores.push(`'${nombreCampo}' no puede ser negativo (se recibió ${numero})`)
    return null
  }
  return numero
}

// Convierte y valida un texto de lista cerrada (moneda)
const parseEnumTexto = (valor, nombreCampo, opcionesValidas, errores, valorPorDefecto = null) => {
  const texto = String(valor ?? '').trim().toLowerCase()
  if (texto === '') {
    if (valorPorDefecto !== null) return valorPorDefecto
    errores.push(`el campo '${nombreCampo}' es requerido`)
    return null
  }
  if (!opcionesValidas.includes(texto)) {
    errores.push(
      `'${nombreCampo}' tiene un valor no permitido ("${valor}"). Valores válidos: ${opcionesValidas.join(', ')}`
    )
    return null
  }
  return texto
}

// POST /api/productos/importar-excel
const importarExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' })
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const hoja = workbook.Sheets[workbook.SheetNames[0]]
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })

    if (filas.length === 0) {
      return res.status(400).json({ success: false, message: 'El archivo está vacío' })
    }

    // Columnas obligatorias que deben existir como encabezado
    const COLUMNAS_OBLIGATORIAS = ['nombre', 'rubro']
    const columnasFaltantes = COLUMNAS_OBLIGATORIAS.filter((col) => !(col in filas[0]))
    if (columnasFaltantes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El archivo no tiene las columnas obligatorias: ${columnasFaltantes.join(', ')}. Descargá la plantilla para ver el formato correcto.`,
      })
    }

    const todasRepresentaciones = await Representacion.find({}, '_id fantasia nombre')
    const resolverRepresentacion = (nombreRep) => {
      const nombre = String(nombreRep).trim().toLowerCase()
      return todasRepresentaciones.find(
        (r) => (r.fantasia || r.nombre || '').toLowerCase() === nombre
      )?._id || null
    }

    const resultados = { creados: 0, actualizados: 0, errores: [] }

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const nroFila = i + 2
      const erroresFila = []

      // ── Validación campo por campo ──────────────────────────────
      const nombre = String(fila.nombre || '').trim()
      if (!nombre) erroresFila.push("el campo 'nombre' es requerido")

      const rubro = String(fila.rubro || '').trim()
      if (!rubro) erroresFila.push("el campo 'rubro' es requerido")

      const costo = parseNumero(fila.costo, 'costo', erroresFila, { opcional: true, porDefecto: 0 })
      const moneda = parseEnumTexto(fila.moneda, 'moneda', MONEDAS_VALIDAS, erroresFila, 'pesos')
      const porcentajeIva = parseEnumNumerico(fila.iva, 'iva', IVA_VALIDOS, erroresFila, 21)
      const TIPO_PRECIO_VALIDOS = ['neto', 'neto_mas_iva']
      const tipoPrecio = parseEnumTexto(
        fila.tipo_precio, 'tipo_precio', TIPO_PRECIO_VALIDOS, erroresFila, 'neto_mas_iva'
      )
      const stockeable = parseBool(fila.stockeable, 'stockeable', erroresFila, true)
      const aceptaStockNegativo = parseBool(fila.stock_negativo, 'stock_negativo', erroresFila, true)
      const cantidadDisponible = parseNumero(
        fila.cantidad, 'cantidad', erroresFila,
        { permitirNegativo: aceptaStockNegativo === true, opcional: true, porDefecto: 0 }
      )
      const habilitadoTexto = String(fila.habilitado ?? '').trim()
      const habilitado = habilitadoTexto === ''
        ? true
        : parseBool(fila.habilitado, 'habilitado', erroresFila, true)

      // Si hay errores de validación, rechazar la fila completa — sin fallback silencioso
      if (erroresFila.length > 0) {
        resultados.errores.push(`Fila ${nroFila}: ${erroresFila.join('; ')}`)
        continue
      }

      try {
        // Resolver marca (crea si no existe — esto no es un campo "inválido", es libre)
        let marcaId = null
        if (fila.marca) {
          const nombreMarca = String(fila.marca).trim()
          let marca = await Marca.findOne({ nombre: new RegExp(`^${nombreMarca}$`, 'i') })
          if (!marca) marca = await Marca.create({ nombre: nombreMarca, creadoPor: req.user._id })
          marcaId = marca._id
        }

        // Resolver representaciones — acá sí avisamos pero no bloqueamos la fila completa
        let representacionIds = []
        if (fila.representaciones) {
          const nombres = String(fila.representaciones).split(',').map((s) => s.trim()).filter(Boolean)
          nombres.forEach((nombreRep) => {
            const id = resolverRepresentacion(nombreRep)
            if (id) representacionIds.push(id)
            else resultados.errores.push(`Fila ${nroFila}: representación "${nombreRep}" no encontrada — se ignoró`)
          })
        }

        const datos = {
          nombre,
          codigo: String(fila.codigo || '').trim() || undefined,
          codigoBarra: String(fila.codigo_barra || '').trim() || undefined,
          descripcion: String(fila.descripcion || '').trim() || undefined,
          rubro,
          subRubro: String(fila.sub_rubro || '').trim() || undefined,
          unidadMedida: String(fila.unidad_medida || '').trim() || undefined,
          costo,
          tipoPrecio,
          moneda,
          porcentajeIva,
          stockeable,
          aceptaStockNegativo,
          cantidadDisponible,
          habilitado,
          disponiblePara: ['ventas'],
          representaciones: representacionIds,
          creadoPor: req.user._id,
        }
        if (marcaId) datos.marca = marcaId

        const filtro = datos.codigo
          ? { codigo: datos.codigo }
          : { nombre: new RegExp(`^${nombre}$`, 'i') }

        const existente = await Producto.findOne(filtro)
        if (existente) {
          await Producto.findByIdAndUpdate(existente._id, datos, { runValidators: true })
          resultados.actualizados++
        } else {
          await Producto.create(datos)
          resultados.creados++
        }
      } catch (err) {
        resultados.errores.push(`Fila ${nroFila}: ${err.message}`)
      }
    }

    const huboExito = resultados.creados > 0 || resultados.actualizados > 0

// Guardar registro de auditoría de esta importación
const registro = await ImportacionExcel.create({
  usuario: req.user._id,
  nombreArchivo: req.file.originalname,
  totalFilas: filas.length,
  creados: resultados.creados,
  actualizados: resultados.actualizados,
  erroresCount: resultados.errores.length,
  errores: resultados.errores,
})

res.json({
  success: true,
  message: huboExito
    ? `Importación completada: ${resultados.creados} creados, ${resultados.actualizados} actualizados${resultados.errores.length > 0 ? `, ${resultados.errores.length} filas con errores` : ''}`
    : `No se importó ningún producto. ${resultados.errores.length} filas con errores.`,
  resultados,
  registroId: registro._id,
})
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/productos/importaciones — historial de importaciones de Excel
const getImportaciones = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const importaciones = await ImportacionExcel.find()
      .populate('usuario', 'nombre email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await ImportacionExcel.countDocuments()
    res.json({ success: true, total, page: Number(page), importaciones })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/productos/plantilla-excel
const descargarPlantilla = async (req, res) => {
  try {
    const columnas = [
      'codigo', 'codigo_barra', 'nombre', 'descripcion', 'marca',
      'rubro', 'sub_rubro', 'unidad_medida', 'costo', 'tipo_precio',
      'moneda', 'iva', 'stockeable', 'stock_negativo', 'cantidad',
      'habilitado', 'representaciones',
    ]

    const ejemplo = [
      {
        codigo: 'PROD-001',
        codigo_barra: '7790001234567',
        nombre: 'Producto ejemplo (precio con IVA)',
        descripcion: 'Descripción del producto',
        marca: 'Coca Cola',
        rubro: 'Bebidas',
        sub_rubro: 'Gaseosas',
        unidad_medida: 'unidad',
        costo: 121,
        tipo_precio: 'neto_mas_iva',
        moneda: 'pesos',
        iva: 21,
        stockeable: 'si',
        stock_negativo: 'no',
        cantidad: 50,
        habilitado: 'si',
        representaciones: 'Coca Cola, Pepsi',
      },
      {
        codigo: 'PROD-002',
        codigo_barra: '7790007654321',
        nombre: 'Producto ejemplo (precio neto)',
        descripcion: 'Este precio NO incluye IVA, se calcula solo',
        marca: 'Pepsi',
        rubro: 'Bebidas',
        sub_rubro: 'Gaseosas',
        unidad_medida: 'caja',
        costo: 100,
        tipo_precio: 'neto',
        moneda: 'pesos',
        iva: 21,
        stockeable: 'no',
        stock_negativo: 'no',
        cantidad: 0,
        habilitado: 'si',
        representaciones: 'Pepsi',
      },
    ]

    const instrucciones = [
      { campo: 'nombre',           obligatorio: 'Sí', valores_permitidos: 'Texto libre', notas: '' },
      { campo: 'rubro',            obligatorio: 'Sí', valores_permitidos: 'Texto libre', notas: '' },
      { campo: 'codigo',           obligatorio: 'No', valores_permitidos: 'Texto libre', notas: 'Si se repite, actualiza el producto existente' },
      { campo: 'codigo_barra',     obligatorio: 'No', valores_permitidos: 'Texto libre', notas: '' },
      { campo: 'descripcion',      obligatorio: 'No', valores_permitidos: 'Texto libre', notas: '' },
      { campo: 'marca',            obligatorio: 'No', valores_permitidos: 'Texto libre', notas: 'Se crea automáticamente si no existe' },
      { campo: 'sub_rubro',        obligatorio: 'No', valores_permitidos: 'Texto libre', notas: '' },
      { campo: 'unidad_medida',    obligatorio: 'No', valores_permitidos: 'Texto libre', notas: 'Ej: unidad, caja, kg' },
      { campo: 'costo',            obligatorio: 'No', valores_permitidos: 'Número ≥ 0', notas: 'Default: 0' },
      { campo: 'tipo_precio',      obligatorio: 'No', valores_permitidos: 'neto | neto_mas_iva', notas: 'Default: neto_mas_iva. Si es "neto" se le suma el IVA automáticamente' },
      { campo: 'moneda',           obligatorio: 'No', valores_permitidos: 'pesos | dolar', notas: 'Default: pesos' },
      { campo: 'iva',              obligatorio: 'No', valores_permitidos: '0 | 10.5 | 21 | 27', notas: 'Default: 21. Cualquier otro valor RECHAZA la fila' },
      { campo: 'stockeable',       obligatorio: 'No', valores_permitidos: 'si | no', notas: 'Default: no' },
      { campo: 'stock_negativo',   obligatorio: 'No', valores_permitidos: 'si | no', notas: 'Default: no' },
      { campo: 'cantidad',         obligatorio: 'No', valores_permitidos: 'Número', notas: 'Negativo solo si stock_negativo = si' },
      { campo: 'habilitado',       obligatorio: 'No', valores_permitidos: 'si | no', notas: 'Default: si' },
      { campo: 'representaciones', obligatorio: 'No', valores_permitidos: 'Nombres separados por coma', notas: 'Deben existir previamente en el sistema' },
    ]

    const wb = XLSX.utils.book_new()

    const wsProductos = XLSX.utils.json_to_sheet(ejemplo, { header: columnas })
    wsProductos['!cols'] = columnas.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos')

    const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones)
    wsInstrucciones['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos.xlsx')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  getProductos, getProducto, crearProducto, editarProducto,
  toggleHabilitado, eliminarProducto, importarExcel, descargarPlantilla, getImportaciones,
}