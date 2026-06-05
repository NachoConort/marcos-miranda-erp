const mongoose = require('mongoose')

const proveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    razonSocial: { type: String, trim: true },
    cuit: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    telefono: { type: String, trim: true },
    rubro: { type: String, trim: true },
    notas: { type: String },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const gastoSchema = new mongoose.Schema(
  {
    descripcion: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },
    fecha: { type: Date, default: Date.now },
    categoria: {
      type: String,
      enum: ['alquiler', 'servicios', 'sueldos', 'insumos', 'impuestos', 'marketing', 'otro'],
      required: true,
    },
    proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor' },
    comprobante: { type: String, trim: true },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta'],
    },
    estado: { type: String, enum: ['pendiente', 'pagado'], default: 'pendiente' },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    notas: { type: String },
  },
  { timestamps: true }
)

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
    cuenta: { type: String, trim: true },
    referenciaVenta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta' },
    referenciaGasto: { type: mongoose.Schema.Types.ObjectId, ref: 'Gasto' },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    notas: { type: String },
  },
  { timestamps: true }
)

module.exports = {
  Proveedor: mongoose.model('Proveedor', proveedorSchema),
  Gasto: mongoose.model('Gasto', gastoSchema),
  Movimiento: mongoose.model('Movimiento', movimientoSchema),
}