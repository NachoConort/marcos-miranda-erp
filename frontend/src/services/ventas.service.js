import api from './api'

export const ventasService = {
  getAll: (params) => api.get('/ventas', { params }).then((r) => r.data),
  getById: (id) => api.get(`/ventas/${id}`).then((r) => r.data),
  crear: (data) => api.post('/ventas', data).then((r) => r.data),
  agregarCobranza: (id, data) => api.post(`/ventas/${id}/cobranzas`, data).then((r) => r.data),
  cancelar: (id) => api.patch(`/ventas/${id}/cancelar`).then((r) => r.data),
  eliminar: (id) => api.delete(`/ventas/${id}`).then((r) => r.data),
}