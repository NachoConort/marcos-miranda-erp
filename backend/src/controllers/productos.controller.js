const Producto = require('../models/Producto.model')
const Marca = require('../models/Marca.model')
const XLSX = require('xlsx')
const Representacion = require('../models/Representacion.model')

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

// POST /api/productos/importar-excel
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

    // Validar que existan las columnas obligatorias en la primera fila
    const COLUMNAS_OBLIGATORIAS = ['nombre', 'rubro']
    const primeraFila = filas[0]
    const columnasFaltantes = COLUMNAS_OBLIGATORIAS.filter(
      (col) => !(col in primeraFila)
    )
    if (columnasFaltantes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El archivo no tiene las columnas obligatorias: ${columnasFaltantes.join(', ')}. Descargá la plantilla para ver el formato correcto.`,
      })
    }

    // Pre-cargar representaciones para resolver por nombre
    const todasRepresentaciones = await Representacion.find({}, '_id fantasia nombre')

    const resolverRepresentacion = (nombreRep) => {
      if (!nombreRep) return null
      const nombre = String(nombreRep).trim().toLowerCase()
      return todasRepresentaciones.find(
        (r) => (r.fantasia || r.nombre || '').toLowerCase() === nombre
      )?._id || null
    }

    const resultados = { creados: 0, actualizados: 0, errores: [] }

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const nroFila = i + 2

      try {
        const nombre = String(fila.nombre || '').trim()
        if (!nombre) {
          resultados.errores.push(`Fila ${nroFila}: el campo 'nombre' es requerido`)
          continue
        }

        // Resolver marca
        let marcaId = null
        if (fila.marca) {
          const nombreMarca = String(fila.marca).trim()
          let marca = await Marca.findOne({ nombre: new RegExp(`^${nombreMarca}$`, 'i') })
          if (!marca) {
            marca = await Marca.create({ nombre: nombreMarca, creadoPor: req.user._id })
          }
          marcaId = marca._id
        }

        // Resolver representaciones — puede ser una o varias separadas por coma
        let representacionIds = []
        if (fila.representaciones) {
          const nombres = String(fila.representaciones).split(',').map((s) => s.trim())
          representacionIds = nombres
            .map(resolverRepresentacion)
            .filter(Boolean)

          // Avisar si alguna representación no se encontró
          nombres.forEach((nombre) => {
            if (nombre && !resolverRepresentacion(nombre)) {
              resultados.errores.push(
                `Fila ${nroFila}: representación "${nombre}" no encontrada — se ignoró`
              )
            }
          })
        }

        const boolVal = (v) => String(v).toLowerCase().trim() === 'si'
        const numVal = (v, def = 0) => isNaN(Number(v)) ? def : Number(v)

        const datos = {
          nombre,
          codigo: String(fila.codigo || '').trim() || undefined,
          codigoBarra: String(fila.codigo_barra || '').trim() || undefined,
          descripcion: String(fila.descripcion || '').trim() || undefined,
          rubro: String(fila.rubro || '').trim() || undefined,
          subRubro: String(fila.sub_rubro || '').trim() || undefined,
          unidadMedida: String(fila.unidad_medida || '').trim() || undefined,
          costo: numVal(fila.costo, 0),
          moneda: ['dolar', 'pesos'].includes(String(fila.moneda).toLowerCase())
            ? String(fila.moneda).toLowerCase()
            : 'pesos',
          porcentajeIva: [0, 10.5, 21, 27].includes(numVal(fila.iva))
            ? numVal(fila.iva)
            : 21,
          stockeable: boolVal(fila.stockeable),
          aceptaStockNegativo: boolVal(fila.stock_negativo),
          cantidadDisponible: numVal(fila.cantidad, 0),
          habilitado: fila.habilitado === '' ? true : boolVal(fila.habilitado),
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
          await Producto.findByIdAndUpdate(existente._id, datos)
          resultados.actualizados++
        } else {
          await Producto.create(datos)
          resultados.creados++
        }
      } catch (err) {
        resultados.errores.push(`Fila ${nroFila}: ${err.message}`)
      }
    }

    res.json({
      success: true,
      message: `Importación completada: ${resultados.creados} creados, ${resultados.actualizados} actualizados${resultados.errores.length > 0 ? `, ${resultados.errores.length} advertencias` : ''}`,
      resultados,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/productos/plantilla-excel
const descargarPlantilla = async (req, res) => {
  try {
    const columnas = [
      'codigo', 'codigo_barra', 'nombre', 'descripcion', 'marca',
      'rubro', 'sub_rubro', 'unidad_medida', 'costo', 'moneda',
      'iva', 'stockeable', 'stock_negativo', 'cantidad', 'habilitado',
      'representaciones',
    ]

    const ejemplo = [{
      codigo: 'PROD-001',
      codigo_barra: '7790001234567',
      nombre: 'Producto ejemplo',
      descripcion: 'Descripción del producto',
      marca: 'Coca Cola',
      rubro: 'Bebidas',
      sub_rubro: 'Gaseosas',
      unidad_medida: 'unidad',
      costo: 100,
      moneda: 'pesos',
      iva: 21,
      stockeable: 'si',
      stock_negativo: 'no',
      cantidad: 50,
      habilitado: 'si',
      representaciones: 'Coca Cola, Pepsi',  // separadas por coma
    }]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(ejemplo, { header: columnas })
    ws['!cols'] = columnas.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
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
  toggleHabilitado, eliminarProducto, importarExcel, descargarPlantilla,
}