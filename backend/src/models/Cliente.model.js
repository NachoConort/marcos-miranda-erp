const mongoose = require('mongoose')

const clienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    razonSocial: { type: String, trim: true },
    cuit: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    telefono: { type: String, trim: true },
    direccion: {
      calle: String,
      ciudad: String,
      provincia: String,
      codigoPostal: String,
    },
    condicionIva: {
      type: String,
      enum: ['responsable_inscripto', 'monotributista', 'consumidor_final', 'exento'],
      default: 'consumidor_final',
    },
    vendedorAsignado: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    notas: { type: String },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Cliente', clienteSchema)
