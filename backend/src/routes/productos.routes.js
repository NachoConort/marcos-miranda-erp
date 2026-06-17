const express = require('express')
const router = express.Router()
const multer = require('multer')
const { protect, authorize } = require('../middlewares/auth.middleware')
const {
  getProductos, getProducto, crearProducto, editarProducto,
  toggleHabilitado, eliminarProducto, importarExcel, descargarPlantilla,
} = require('../controllers/productos.controller')

// Multer en memoria (no guarda el archivo en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const validos = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (validos.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se aceptan archivos .xlsx o .xls'))
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

router.get('/plantilla-excel', protect, descargarPlantilla)
router.get('/',    protect, getProductos)
router.get('/:id', protect, getProducto)
router.post('/',   protect, crearProducto)
router.post('/importar-excel', protect, upload.single('archivo'), importarExcel)
router.put('/:id', protect, editarProducto)
router.patch('/:id/habilitar', protect, toggleHabilitado)
router.delete('/:id', protect, authorize('admin'), eliminarProducto)

module.exports = router