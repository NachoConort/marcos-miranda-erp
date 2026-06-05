const mongoose = require('mongoose')

const permisoVendedorSchema = new mongoose.Schema(
  {
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

permisoVendedorSchema.index({ vendedor: 1, representacion: 1 }, { unique: true })

module.exports = mongoose.models.PermisoVendedor || mongoose.model('PermisoVendedor', permisoVendedorSchema)