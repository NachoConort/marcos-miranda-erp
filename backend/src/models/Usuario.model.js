const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const usuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    rol: {
      type: String,
      enum: ['admin', 'vendedor', 'contador', 'visualizador'],
      default: 'visualizador',
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

usuarioSchema.methods.matchPassword = async function (passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password)
}

module.exports = mongoose.model('Usuario', usuarioSchema)
