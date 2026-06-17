const mongoose = require('mongoose')

const marcaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Marca || mongoose.model('Marca', marcaSchema)