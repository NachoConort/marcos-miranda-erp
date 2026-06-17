import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import useAuthStore from '@/store/auth.store'

export const useFormData = (representacionId = null) => {
  const { usuario } = useAuthStore()
  const esAdmin = usuario?.rol === 'admin'

  // Representaciones
  const { data: repData, isLoading: loadingRep } = useQuery({
    queryKey: ['form-representaciones', usuario._id, esAdmin],
    queryFn: async () => {
      if (esAdmin) {
        return api.get('/representaciones', { params: { limit: 100 } }).then((r) => ({
          representaciones: r.data.items || [],
        }))
      }
      return api.get('/permisos', {
        params: { vendedor: usuario._id, activo: true, limit: 100 },
      }).then((r) => ({
        representaciones: (r.data.items || []).map((p) => p.representacion).filter(Boolean),
      }))
    },
  })

  // Clientes
  const { data: clientesData, isLoading: loadingClientes } = useQuery({
    queryKey: ['form-clientes', usuario._id, esAdmin],
    queryFn: () => api.get('/clientes', {
      params: esAdmin ? { limit: 200 } : { vendedorAlta: usuario._id, limit: 200 },
    }).then((r) => r.data),
  })

  // Vendedores (solo admin los ve todos, vendedor solo se ve a sí mismo)
  const { data: vendedoresData, isLoading: loadingVendedores } = useQuery({
    queryKey: ['form-vendedores', usuario._id, esAdmin],
    queryFn: () => {
      if (esAdmin) {
        return api.get('/auth/usuarios', { params: { limit: 100 } }).then((r) => r.data)
      }
      return Promise.resolve({ usuarios: [usuario] })
    },
  })

  // Lista de precios
  const { data: listaData } = useQuery({
    queryKey: ['form-lista-precios', usuario._id, representacionId],
    queryFn: () => api.get('/listas-precios', {
      params: { vendedor: usuario._id, representacion: representacionId, activa: true },
    }).then((r) => r.data),
    enabled: !!representacionId,
  })

  // Productos
  const { data: productosData } = useQuery({
    queryKey: ['form-productos', representacionId],
    queryFn: () => api.get('/productos', {
      params: { representacion: representacionId, habilitado: true, limit: 200 },
    }).then((r) => r.data),
    enabled: !!representacionId,
  })

  return {
    representaciones: repData?.representaciones || [],
    clientes: clientesData?.clientes || [],
    vendedores: vendedoresData?.usuarios || [],
    listaPrecios: listaData?.items?.[0]?.items || [],
    productos: productosData?.productos || [],
    loading: loadingRep || loadingClientes || loadingVendedores,
  }
}