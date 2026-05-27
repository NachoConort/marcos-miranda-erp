const mongoose = require('mongoose')

const itemPresupuestoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
})

const presupuestoSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    items: [itemPresupuestoSchema],
    subtotal: { type: Number, required: true },
    descuentoGlobal: { type: Number, default: 0 },
    iva: { type: Number, default: 0 },
    total: { type: Number, required: true },
    validezDias: { type: Number, default: 30 },
    fechaVencimiento: { type: Date },
    estado: {
      type: String,
      enum: ['borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'convertido'],
      default: 'borrador',
    },
    notas: { type: String },
    ventaGenerada: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta' },
  },
  { timestamps: true }
)

presupuestoSchema.pre('save', async function (next) {
  if (this.isNew) {
    const ultimo = await this.constructor.findOne().sort({ numero: -1 })
    this.numero = ultimo ? ultimo.numero + 1 : 1
    if (this.validezDias) {
      this.fechaVencimiento = new Date(Date.now() + this.validezDias * 24 * 60 * 60 * 1000)
    }
  }
  next()
})

module.exports = mongoose.model('Presupuesto', presupuestoSchema)
