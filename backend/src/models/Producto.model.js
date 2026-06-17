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

    costo: { type: Number, default: 0, min: 0 },
    moneda: { type: String, enum: ['pesos', 'dolar'], default: 'pesos' },
    porcentajeIva: {
      type: Number,
      enum: [0, 10.5, 21, 27],
      default: 21,
    },

    unidadMedida: { type: String, trim: true },
    stockeable: { type: Boolean, default: false },
    aceptaStockNegativo: { type: Boolean, default: false }, // solo aplica si stockeable = true
    cantidadDisponible: { type: Number, default: 0 },       // puede ser negativo si aceptaStockNegativo

    // Solo para ventas — se eliminó 'compras'
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

productoSchema.index({ nombre: 'text', codigo: 'text', codigoBarra: 'text' })

module.exports = mongoose.models.Producto || mongoose.model('Producto', productoSchema)