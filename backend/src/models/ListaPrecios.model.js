const mongoose = require('mongoose')

const itemPrecioSchema = new mongoose.Schema({
  codigo: { type: String, trim: true },
  descripcion: { type: String, required: true, trim: true },
  unidad: { type: String, trim: true },
  precio: { type: Number, required: true, min: 0 },
})

const listaPreciosSchema = new mongoose.Schema(
  {
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    nombre: { type: String, trim: true },
    items: [itemPrecioSchema],
    descuentoDefault: { type: Number, default: 0, min: 0, max: 100 },
    activa: { type: Boolean, default: true },
    vigenciaDesde: { type: Date },
    vigenciaHasta: { type: Date },
  },
  { timestamps: true }
)

listaPreciosSchema.index({ vendedor: 1, representacion: 1, activa: 1 })

module.exports = mongoose.model('ListaPrecios', listaPreciosSchema)