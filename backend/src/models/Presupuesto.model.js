const mongoose = require('mongoose')

const itemPresupuestoSchema = new mongoose.Schema({
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

const presupuestoSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true },

    // Fecha del comprobante (puede diferir de createdAt)
    fechaComprobante: { type: Date, default: Date.now },

    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    representacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Representacion', required: true },
    listaPrecios: { type: mongoose.Schema.Types.ObjectId, ref: 'ListaPrecios' },

    items: [itemPresupuestoSchema],
    descuentoGlobal: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },

    // Comprobante opcional
    comprobante: { type: comprobanteSchema, default: null },

    estado: {
      type: String,
      enum: ['borrador', 'enviado', 'convertido', 'rechazado', 'vencido'],
      default: 'borrador',
    },

    // Comisiones — se precargan de ConfigComision pero se pueden editar
    comisionRepresentacion: {
      porcentaje: { type: Number, default: 0, min: 0, max: 100 },
      tipo: { type: String, enum: ['con_factura', 'en_negro'], default: 'con_factura' },
      monto: { type: Number, default: 0 },
    },
    comisionVendedor: {
      porcentaje: { type: Number, default: 0, min: 0, max: 100 },
      tipo: { type: String, enum: ['con_factura', 'en_negro'], default: 'con_factura' },
      monto: { type: Number, default: 0 },
    },

    personal: { type: String, trim: true },
    observaciones: { type: String },
    validezDias: { type: Number, default: 30 },
    fechaVencimiento: { type: Date },
    pedidoGenerado: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' },
  },
  { timestamps: true } // updatedAt = fecha última modificación
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

module.exports = mongoose.models.Presupuesto || mongoose.model('Presupuesto', presupuestoSchema)
