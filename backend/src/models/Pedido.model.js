const mongoose = require('mongoose')

const itemPedidoSchema = new mongoose.Schema({
  itemListaId: { type: mongoose.Schema.Types.ObjectId },
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' }, // ← agregar
  codigo: { type: String, trim: true },
  descripcion: { type: String, required: true, trim: true },
  unidad: { type: String, trim: true },
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  precioOriginalLista: { type: Number, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
  subtotalConDescuento: { type: Number, required: true },
  porcentajeIva: { type: Number, enum: [0, 10.5, 21, 27], default: 21 },
})

const pedidoSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    presupuestoOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Presupuesto' },

    // Tipo de facturación
    tipoFacturacion: {
      type: String,
      enum: ['facturado', 'comprobante'],
      default: 'facturado',
    },
    porcentajeIva: { type: Number, default: 21 }, // solo aplica si tipoFacturacion = facturado

    items: [itemPedidoSchema],
    descuentoGlobal: { type: Number, default: 0, min: 0, max: 100 },

    // Totales desglosados
    subtotalBruto: { type: Number, required: true },     // sin descuentos
    totalDescuentos: { type: Number, default: 0 },       // suma de todos los descuentos
    subtotalNeto: { type: Number, required: true },      // después de descuentos, antes de IVA
    totalIva: { type: Number, default: 0 },              // monto IVA
    total: { type: Number, required: true },             // total final

    estado: {
      type: String,
      enum: ['pendiente', 'enviado', 'completado', 'cancelado'],
      default: 'pendiente',
    },
    notas: { type: String },
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