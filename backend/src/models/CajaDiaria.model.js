const mongoose = require('mongoose')

const movimientoSchema = new mongoose.Schema(
  {
    concepto: { type: String, required: true, trim: true },
    detalle: { type: String, trim: true },
    tipo: { type: String, enum: ['ingreso', 'egreso'], required: true },
    monto: { type: Number, required: true, min: 0 },
    saldo: { type: Number, required: true }, // saldo acumulado después de este movimiento
    // Origen del movimiento
    origen: {
      type: String,
      enum: ['manual', 'venta', 'cobranza', 'gasto'],
      default: 'manual',
    },
    referenciaId: { type: mongoose.Schema.Types.ObjectId }, // id de la venta/gasto si aplica
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { timestamps: true }
)

const cajaDiariaSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    saldoInicial: { type: Number, required: true, default: 0 },
    saldoFinal: { type: Number, default: null }, // null = caja abierta
    movimientos: [movimientoSchema],
    estado: {
      type: String,
      enum: ['abierta', 'cerrada'],
      default: 'abierta',
    },
    cerradaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    fechaCierre: { type: Date },
    observacionCierre: { type: String, trim: true },
  },
  { timestamps: true }
)

module.exports = mongoose.models.CajaDiaria || mongoose.model('CajaDiaria', cajaDiariaSchema)