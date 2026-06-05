import api from './api'

export const representacionesService = {
  getAll: (params) => api.get('/representaciones', { params }).then((r) => r.data),
  getById: (id) => api.get(`/representaciones/${id}`).then((r) => r.data),
  crear: (data) => api.post('/representaciones', data).then((r) => r.data),
  editar: (id, data) => api.put(`/representaciones/${id}`, data).then((r) => r.data),
  desactivar: (id) => api.delete(`/representaciones/${id}`).then((r) => r.data),
}