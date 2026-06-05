const mongoose = require('mongoose')

const productoSchema = new mongoose.Schema(
  {
    codigo: { type: String, trim: true },
    codigoBarra: { type: String, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    marca: { type: String, trim: true },
    rubro: { type: String, trim: true },
    subRubro: { type: String, trim: true },
    tipoProducto: { type: String, trim: true },

    // Puede pertenecer a varias representaciones
    representaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Representacion' }],

    // Precios y costos
    costo: { type: Number, default: 0, min: 0 },
    moneda: { type: String, enum: ['pesos', 'dolar'], default: 'pesos' },
    porcentajeIva: {
      type: Number,
      enum: [0, 10.5, 21, 27],
      default: 21,
    },

    // Unidad y stock
    unidadMedida: { type: String, trim: true }, // ej: "unidad", "caja", "kg"
    stockeable: { type: Boolean, default: false },
    cantidadDisponible: { type: Number, default: 0, min: 0 },

    // Disponibilidad
    disponiblePara: {
      type: [String],
      enum: ['compras', 'ventas'],
      default: ['compras', 'ventas'],
    },
    habilitado: { type: Boolean, default: true },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true }
)

// Índice para búsqueda rápida
productoSchema.index({ nombre: 'text', codigo: 'text', codigoBarra: 'text', marca: 'text' })

module.exports = mongoose.models.Producto || mongoose.model('Producto', productoSchema)