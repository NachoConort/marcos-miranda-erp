const mongoose = require('mongoose')

const itemVentaSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
})

const ventaSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    items: [itemVentaSchema],
    subtotal: { type: Number, required: true },
    descuentoGlobal: { type: Number, default: 0 },
    iva: { type: Number, default: 0 },
    total: { type: Number, required: true },
    estado: {
      type: String,
      enum: ['pendiente', 'cobrada', 'cancelada', 'parcial'],
      default: 'pendiente',
    },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'cuenta_corriente'],
    },
    fechaVencimiento: { type: Date },
    presupuestoOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Presupuesto' },
    notas: { type: String },
  },
  { timestamps: true }
)

// Auto-incrementar número de venta
ventaSchema.pre('save', async function (next) {
  if (this.isNew) {
    const ultima = await this.constructor.findOne().sort({ numero: -1 })
    this.numero = ultima ? ultima.numero + 1 : 1
  }
  next()
})

module.exports = mongoose.model('Venta', ventaSchema)
