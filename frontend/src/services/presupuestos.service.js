import api from './api'

export const presupuestosService = {
  getAll: (params) => api.get('/presupuestos', { params }).then((r) => r.data),
  getById: (id) => api.get(`/presupuestos/${id}`).then((r) => r.data),
  getComisionesDefault: (representacion) =>
    api.get('/presupuestos/comisiones-default', { params: { representacion } }).then((r) => r.data),
  crear: (data) => api.post('/presupuestos', data).then((r) => r.data),
  editar: (id, data) => api.put(`/presupuestos/${id}`, data).then((r) => r.data),
  cambiarEstado: (id, estado) => api.patch(`/presupuestos/${id}/estado`, { estado }).then((r) => r.data),
  eliminar: (id) => api.delete(`/presupuestos/${id}`).then((r) => r.data),
}