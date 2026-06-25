const mongoose = require('mongoose')

const importacionExcelSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nombreArchivo: { type: String, trim: true },
    totalFilas: { type: Number, default: 0 },
    creados: { type: Number, default: 0 },
    actualizados: { type: Number, default: 0 },
    erroresCount: { type: Number, default: 0 },
    errores: [{ type: String }], // detalle de errores para poder revisar después
  },
  { timestamps: true } // createdAt = fecha y hora exacta de la importación
)

module.exports = mongoose.models.ImportacionExcel || mongoose.model('ImportacionExcel', importacionExcelSchema)