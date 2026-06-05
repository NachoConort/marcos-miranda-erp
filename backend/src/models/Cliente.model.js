const mongoose = require('mongoose')

const condicionRepresentacionSchema = new mongoose.Schema({
  representacion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Representacion',
    required: true,
  },
  porcentajeComision: { type: Number, default: 0, min: 0, max: 100 },
  porcentajeDescuento: { type: Number, default: 0, min: 0, max: 100 },
})

const clienteSchema = new mongoose.Schema(
  {
    // Datos principales
    razonSocial: { type: String, required: true, trim: true },
    fantasia: { type: String, trim: true },
    rubro: { type: String, trim: true },
    cuit: { type: String, trim: true },

    // Ubicación
    provincia: { type: String, trim: true },
    localidad: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    domicilio: { type: String, trim: true },

    // Logística
    transporte: { type: String, trim: true },
    numero: { type: String, trim: true }, // número de cliente/cuenta

    // Contacto
    contacto: { type: String, trim: true }, // nombre de la persona de contacto
    mail: { type: String, lowercase: true, trim: true },
    telefono: { type: String, trim: true },

    // Vendedor que dio de alta al cliente
    vendedorAlta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    // Representaciones a las que compra + condiciones por representación
    representaciones: [condicionRepresentacionSchema],

    activo: { type: Boolean, default: true },
    notas: { type: String },
  },
  { timestamps: true } // createdAt = fecha de alta
)

module.exports = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema)
