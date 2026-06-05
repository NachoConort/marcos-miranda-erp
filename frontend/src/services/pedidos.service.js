import api from './api'

export const pedidosService = {
  getAll: (params) => api.get('/pedidos', { params }).then((r) => r.data),
  getById: (id) => api.get(`/pedidos/${id}`).then((r) => r.data),
  crear: (data) => api.post('/pedidos', data).then((r) => r.data),
  editar: (id, data) => api.put(`/pedidos/${id}`, data).then((r) => r.data),
  cambiarEstado: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }).then((r) => r.data),
  eliminar: (id) => api.delete(`/pedidos/${id}`).then((r) => r.data),
}