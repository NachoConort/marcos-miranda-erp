const mongoose = require('mongoose')

const contactoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  numero: { type: String, trim: true },
  mail: { type: String, lowercase: true, trim: true },
  cargo: { type: String, trim: true },
})

const cuentaBancariaSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['factura', 'negro'], required: true },
  banco: { type: String, trim: true },
  titular: { type: String, trim: true },
  cbu: { type: String, trim: true },
  alias: { type: String, trim: true },
  moneda: { type: String, enum: ['pesos', 'dolar'], default: 'pesos' },
})

const representacionSchema = new mongoose.Schema(
  {
    fantasia: { type: String, required: true, trim: true },
    canal: { type: String, trim: true },
    razonSocial: { type: String, trim: true },
    cuit: { type: String, trim: true },

    // Ubicación
    provincia: { type: String, trim: true },
    localidad: { type: String, trim: true },
    domicilio: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },

    // Contactos múltiples
    contactos: [contactoSchema],

    // Plazo de pago
    plazoPago: {
      type: String,
      enum: ['contado', '15_dias', '30_dias', '60_dias', '90_dias'],
    },

    // Cuentas bancarias (facturas y en negro, múltiples)
    cuentasBancarias: [cuentaBancariaSchema],

    // Listas de precio y comisión — se gestionan desde ListaPrecios y ConfigComision
    // Acá solo guardamos referencia rápida para mostrar en la ficha
    notasComision: { type: String, trim: true },

    activa: { type: Boolean, default: true },
    notas: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Representacion || mongoose.model('Representacion', representacionSchema)