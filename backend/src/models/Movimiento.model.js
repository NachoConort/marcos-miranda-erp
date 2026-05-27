const mongoose = require('mongoose')

const movimientoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ['ingreso', 'egreso'], required: true },
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },
    fecha: { type: Date, default: Date.now },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta'],
      required: true,
    },
    cuenta: { type: String, trim: true }, // Caja chica, banco, etc.
    categoria: {
      type: String,
      enum: ['venta', 'cobro_cliente', 'pago_proveedor', 'gasto_operativo', 'otro'],
      default: 'otro',
    },
    referenciaVenta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta' },
    referenciaGasto: { type: mongoose.Schema.Types.ObjectId, ref: 'Gasto' },
    referenciaProveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor' },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    notas: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Movimiento', movimientoSchema)
