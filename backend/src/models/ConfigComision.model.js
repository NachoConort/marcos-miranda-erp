const mongoose = require('mongoose')

const configComisionSchema = new mongoose.Schema(
  {
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    porcentaje: { type: Number, required: true, min: 0, max: 100 },
    tipo: { type: String, enum: ['con_factura', 'en_negro'], required: true },
  },
  { timestamps: true }
)

configComisionSchema.index({ vendedor: 1, representacion: 1 }, { unique: true })

configComisionSchema.methods.calcular = function (montoTotal) {
  if (this.tipo === 'con_factura') return (montoTotal / 1.21) * (this.porcentaje / 100)
  return montoTotal * (this.porcentaje / 100)
}

module.exports = mongoose.model('ConfigComision', configComisionSchema)