import api from './api'

export const productosService = {
  getAll: (params) => api.get('/productos', { params }).then((r) => r.data),
  getById: (id) => api.get(`/productos/${id}`).then((r) => r.data),
  crear: (data) => api.post('/productos', data).then((r) => r.data),
  editar: (id, data) => api.put(`/productos/${id}`, data).then((r) => r.data),
  toggleHabilitado: (id) => api.patch(`/productos/${id}/habilitar`).then((r) => r.data),
  eliminar: (id) => api.delete(`/productos/${id}`).then((r) => r.data),
  importarExcel: (archivo) => {
    const form = new FormData()
    form.append('archivo', archivo)
    return api.post('/productos/importar-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  descargarPlantilla: () =>
    api.get('/productos/plantilla-excel', { responseType: 'blob' }).then((r) => r.data),
  getImportaciones: (params) =>
    api.get('/productos/importaciones', { params }).then((r) => r.data),
}