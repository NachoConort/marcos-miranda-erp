import api from './api'

export const clientesService = {
  getAll: (params) => api.get('/clientes', { params }).then((r) => r.data),
  getById: (id) => api.get(`/clientes/${id}`).then((r) => r.data),
  crear: (data) => api.post('/clientes', data).then((r) => r.data),
  editar: (id, data) => api.put(`/clientes/${id}`, data).then((r) => r.data),
  desactivar: (id) => api.delete(`/clientes/${id}`).then((r) => r.data),
}