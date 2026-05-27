const mongoose = require('mongoose')

// ─── Gasto ────────────────────────────────────────────────────────────────────
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
    comprobante: { type: String }, // número de factura/recibo
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

// ─── Proveedor ────────────────────────────────────────────────────────────────
const proveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    razonSocial: { type: String, trim: true },
    cuit: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    telefono: { type: String, trim: true },
    rubro: { type: String, trim: true },
    contacto: { type: String, trim: true },
    direccion: {
      calle: String,
      ciudad: String,
      provincia: String,
    },
    condicionPago: { type: String, trim: true }, // ej: "30 días", "contado"
    activo: { type: Boolean, default: true },
    notas: { type: String },
  },
  { timestamps: true }
)

// ─── Comisión ─────────────────────────────────────────────────────────────────
const comisionSchema = new mongoose.Schema(
  {
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    venta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
    porcentaje: { type: Number, required: true, min: 0, max: 100 },
    montoVenta: { type: Number, required: true },
    montoComision: { type: Number, required: true },
    periodo: { type: String }, // ej: "2024-06"
    estado: {
      type: String,
      enum: ['pendiente', 'liquidada', 'cancelada'],
      default: 'pendiente',
    },
    fechaLiquidacion: { type: Date },
    notas: { type: String },
  },
  { timestamps: true }
)

module.exports = {
  Gasto: mongoose.model('Gasto', gastoSchema),
  Proveedor: mongoose.model('Proveedor', proveedorSchema),
  Comision: mongoose.model('Comision', comisionSchema),
}
