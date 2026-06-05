import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clientesService } from '@/services/clientes.service'
import { Plus, Search, Pencil, UserX } from 'lucide-react'
import useAuthStore from '@/store/auth.store'

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR')

export default function ClientesPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', busquedaActiva],
    queryFn: () => clientesService.getAll({ busqueda: busquedaActiva || undefined }),
  })

  const { mutate: desactivar } = useMutation({
    mutationFn: (id) => clientesService.desactivar(id),
    onSuccess: () => queryClient.invalidateQueries(['clientes']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  const buscar = () => setBusquedaActiva(busqueda)
  const limpiar = () => { setBusqueda(''); setBusquedaActiva('') }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        <button
          onClick={() => navigate('/clientes/nuevo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="card py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Buscar por razón social, fantasía, CUIT o contacto..."
              className="input pl-8"
            />
          </div>
          <button onClick={buscar} className="btn-primary">Buscar</button>
          {busquedaActiva && (
            <button onClick={limpiar} className="btn-secondary">Limpiar</button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.clientes?.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">No se encontraron clientes</p>
            <button onClick={() => navigate('/clientes/nuevo')} className="mt-3 text-sm text-blue-600 hover:underline">
              Agregar el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Razón social</th>
                  <th className="px-4 py-3 font-medium">Fantasía</th>
                  <th className="px-4 py-3 font-medium">CUIT</th>
                  <th className="px-4 py-3 font-medium">Localidad</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Representaciones</th>
                  <th className="px-4 py-3 font-medium">Vendedor alta</th>
                  <th className="px-4 py-3 font-medium">Fecha alta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.clientes?.map((c) => (
                  <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.razonSocial}</td>
                    <td className="px-4 py-3 text-gray-500">{c.fantasia || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cuit || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[c.localidad, c.provincia].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.contacto || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.representaciones?.length > 0 ? c.representaciones.map((r) => (
                          <span key={r._id} className="badge bg-blue-50 text-blue-700 text-xs">
                            {r.representacion?.nombre}
                          </span>
                        )) : <span className="text-gray-300 text-xs">Sin asignar</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.vendedorAlta?.nombre}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatFecha(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/clientes/${c._id}/editar`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        {usuario.rol === 'admin' && c.activo && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Desactivar a ${c.razonSocial}?`)) desactivar(c._id)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Desactivar"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
