const mongoose = require('mongoose')

const itemVentaSchema = new mongoose.Schema({
  itemListaId: { type: mongoose.Schema.Types.ObjectId },
  codigo: { type: String, trim: true },
  descripcion: { type: String, required: true, trim: true },
  unidad: { type: String, trim: true },
  listaPrecios: { type: String, trim: true }, // nombre de la lista usada
  cantidad: { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: { type: Number, required: true },
  porcentajeIva: { type: Number, enum: [0, 10.5, 21, 27], default: 21 },
})

const cobranzaSchema = new mongoose.Schema({
  caja: { type: String, trim: true, required: true },
  fechaMovimiento: { type: Date, required: true },
  tipoValor: {
    type: String,
    enum: ['efectivo', 'cheque', 'transferencia', 'tarjeta', 'otros'],
    required: true,
  },
  referencia: { type: String, trim: true },
  moneda: { type: String, enum: ['pesos', 'dolar'], default: 'pesos' },
  cotizacion: { type: Number, default: 1 }, // solo aplica si moneda = dolar
  monto: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }, // monto * cotizacion en pesos
})

const comprobanteSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['factura', 'comprobante'] },
  letra: { type: String, enum: ['A', 'B', 'C', 'X'] },
  puntoVenta: { type: Number },
  numero: { type: Number },
  fechaEmision: { type: Date },
  validacionAfip: {
    type: String,
    enum: ['validada', 'no_validada', 'pendiente'],
    default: 'pendiente',
  },
  cae: { type: String, trim: true },
})

const ventaSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    pedidoOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' },
    presupuestoOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Presupuesto' },

    // Comprobante de la representación
    comprobante: { type: comprobanteSchema, required: true },

    // Items
    items: [itemVentaSchema],
    descuentoGlobal: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },

    // Cobranza — puede haber múltiples pagos
    cobranzas: [cobranzaSchema],
    totalCobrado: { type: Number, default: 0 },
    cobroPendiente: { type: Boolean, default: true },

    // Estado
    estado: {
      type: String,
      enum: ['pendiente', 'cobrado_parcial', 'cobrado', 'cancelado'],
      default: 'pendiente',
    },

    // Condición de pago
    condicionPago: {
      type: String,
      enum: ['contado', '15_dias', '30_dias', '60_dias', '90_dias'],
    },
    fechaVencimientoPago: { type: Date },

    // Cobrador
    cobrador: {
      nombre: { type: String, trim: true },
      telefono: { type: String, trim: true },
      email: { type: String, trim: true },
    },

    // Logística
    estadoRemito: {
      type: String,
      enum: ['sin_remito', 'pendiente', 'entregado'],
      default: 'sin_remito',
    },
    provincia: { type: String, trim: true },
    personal: { type: String, trim: true },
    integracion: { type: String, trim: true },
    notas: { type: String },

    comision: { type: mongoose.Schema.Types.ObjectId, ref: 'Comision' },
  },
  { timestamps: true }
)

ventaSchema.pre('save', async function (next) {
  if (this.isNew) {
    const ultima = await this.constructor.findOne().sort({ numero: -1 })
    this.numero = ultima ? ultima.numero + 1 : 1
  }
  // Recalcular total cobrado y estado cada vez que se guarda
  if (this.cobranzas?.length > 0) {
    this.totalCobrado = Math.round(
      this.cobranzas.reduce((acc, c) => acc + c.total, 0) * 100
    ) / 100
    if (this.totalCobrado >= this.total) {
      this.estado = 'cobrado'
      this.cobroPendiente = false
    } else if (this.totalCobrado > 0) {
      this.estado = 'cobrado_parcial'
      this.cobroPendiente = true
    }
  }
  next()
})

module.exports = mongoose.models.Venta || mongoose.model('Venta', ventaSchema)
