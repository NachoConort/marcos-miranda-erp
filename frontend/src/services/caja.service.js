import api from './api'

export const cajaService = {
  getCajas: (params) => api.get('/caja', { params }).then((r) => r.data),
  getCajaHoy: () => api.get('/caja/hoy').then((r) => r.data),
  getCaja: (id) => api.get(`/caja/${id}`).then((r) => r.data),
  abrirCaja: (data) => api.post('/caja/abrir', data).then((r) => r.data),
  agregarMovimiento: (id, data) => api.post(`/caja/${id}/movimientos`, data).then((r) => r.data),
  eliminarMovimiento: (cajaId, movId) => api.delete(`/caja/${cajaId}/movimientos/${movId}`).then((r) => r.data),
  cerrarCaja: (id, data) => api.patch(`/caja/${id}/cerrar`, data).then((r) => r.data),
}