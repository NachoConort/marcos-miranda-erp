const mongoose = require('mongoose')

const productoSchema = new mongoose.Schema(
  {
    codigo: { type: String, trim: true },
    codigoBarra: { type: String, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    marca: { type: mongoose.Schema.Types.ObjectId, ref: 'Marca' },
    rubro: { type: String, trim: true },
    subRubro: { type: String, trim: true },

    representaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Representacion' }],

    // El usuario ingresa "costo" y aclara si ya tiene IVA o es neto
    costo: { type: Number, default: 0, min: 0 },
    tipoPrecio: {
      type: String,
      enum: ['neto', 'neto_mas_iva'],
      default: 'neto_mas_iva',
    },
    // Calculado automáticamente según tipoPrecio — este es el que se usa en ventas/pedidos/presupuestos
    precioFinal: { type: Number, default: 0, min: 0 },

    moneda: { type: String, enum: ['pesos', 'dolar'], default: 'pesos' },
    porcentajeIva: {
      type: Number,
      enum: [0, 10.5, 21, 27],
      default: 21,
    },

    unidadMedida: { type: String, trim: true },
    stockeable: { type: Boolean, default: false },
    aceptaStockNegativo: { type: Boolean, default: false },
    cantidadDisponible: { type: Number, default: 0 },

    disponiblePara: {
      type: [String],
      enum: ['ventas'],
      default: ['ventas'],
    },
    habilitado: { type: Boolean, default: true },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true }
)

// Calcular precioFinal automáticamente antes de guardar
productoSchema.pre('save', function (next) {
  if (this.tipoPrecio === 'neto') {
    // El costo ingresado es neto — hay que sumarle el IVA
    this.precioFinal = Math.round(this.costo * (1 + this.porcentajeIva / 100) * 100) / 100
  } else {
    // El costo ingresado ya incluye IVA
    this.precioFinal = this.costo
  }
  next()
})

// También recalcular en findOneAndUpdate (findByIdAndUpdate)
productoSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate()
  // Si se está actualizando costo, tipoPrecio o porcentajeIva, recalcular
  if (update.costo !== undefined || update.tipoPrecio !== undefined || update.porcentajeIva !== undefined) {
    const doc = await this.model.findOne(this.getQuery())
    const costo = update.costo ?? doc?.costo ?? 0
    const tipoPrecio = update.tipoPrecio ?? doc?.tipoPrecio ?? 'neto_mas_iva'
    const iva = update.porcentajeIva ?? doc?.porcentajeIva ?? 21

    update.precioFinal = tipoPrecio === 'neto'
      ? Math.round(costo * (1 + iva / 100) * 100) / 100
      : costo
  }
  next()
})

productoSchema.index({ nombre: 'text', codigo: 'text', codigoBarra: 'text' })

module.exports = mongoose.models.Producto || mongoose.model('Producto', productoSchema)