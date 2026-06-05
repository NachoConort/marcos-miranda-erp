const mongoose = require('mongoose')

const itemPedidoSchema = new mongoose.Schema({
  itemListaId: { type: mongoose.Schema.Types.ObjectId },
  codigo: { type: String, trim: true },
  descripcion: { type: String, required: true, trim: true },
  unidad: { type: String, trim: true },
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  precioOriginalLista: { type: Number, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
})

const pedidoSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    // Puede venir de un presupuesto o crearse directo
    presupuestoOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Presupuesto' },
    items: [itemPedidoSchema],
    descuentoGlobal: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    estado: {
      type: String,
      enum: ['pendiente', 'enviado', 'completado', 'cancelado'],
      default: 'pendiente',
    },
    notas: { type: String },
    // Referencia a la venta generada cuando se confirma
    ventaGenerada: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta' },
  },
  { timestamps: true }
)

pedidoSchema.pre('save', async function (next) {
  if (this.isNew) {
    const ultimo = await this.constructor.findOne().sort({ numero: -1 })
    this.numero = ultimo ? ultimo.numero + 1 : 1
  }
  next()
})

module.exports = mongoose.models.Pedido || mongoose.model('Pedido', pedidoSchema)