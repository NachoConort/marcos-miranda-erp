const mongoose = require('mongoose')

const comisionSchema = new mongoose.Schema(
  {
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    venta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
    porcentaje: { type: Number, required: true },
    tipo: { type: String, enum: ['con_factura', 'en_negro'], required: true },
    montoVenta: { type: Number, required: true },
    montoComision: { type: Number, required: true },
    periodo: { type: String },
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

module.exports = mongoose.model('Comision', comisionSchema)