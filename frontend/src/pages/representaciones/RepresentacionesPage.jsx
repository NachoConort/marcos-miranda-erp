import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { representacionesService } from '@/services/representaciones.service'
import { Plus, Search, Pencil, PowerOff } from 'lucide-react'
import useAuthStore from '@/store/auth.store'

const PLAZOS = {
  contado: 'Contado',
  '15_dias': '15 días',
  '30_dias': '30 días',
  '60_dias': '60 días',
  '90_dias': '90 días',
}

export default function RepresentacionesPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['representaciones', busquedaActiva],
    queryFn: () => representacionesService.getAll({ busqueda: busquedaActiva || undefined }),
  })

  const { mutate: desactivar } = useMutation({
    mutationFn: (id) => representacionesService.desactivar(id),
    onSuccess: () => queryClient.invalidateQueries(['representaciones']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Representaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        {usuario.rol === 'admin' && (
          <button
            onClick={() => navigate('/representaciones/nueva')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nueva representación
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="card py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setBusquedaActiva(busqueda)}
              placeholder="Buscar por fantasía, razón social o CUIT..."
              className="input pl-8"
            />
          </div>
          <button onClick={() => setBusquedaActiva(busqueda)} className="btn-primary">Buscar</button>
          {busquedaActiva && (
            <button onClick={() => { setBusqueda(''); setBusquedaActiva('') }} className="btn-secondary">Limpiar</button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.items?.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">No se encontraron representaciones</p>
            {usuario.rol === 'admin' && (
              <button onClick={() => navigate('/representaciones/nueva')} className="mt-3 text-sm text-blue-600 hover:underline">
                Agregar la primera
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Fantasía</th>
                  <th className="px-4 py-3 font-medium">Razón social</th>
                  <th className="px-4 py-3 font-medium">CUIT</th>
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3 font-medium">Localidad</th>
                  <th className="px-4 py-3 font-medium">Plazo pago</th>
                  <th className="px-4 py-3 font-medium">Contactos</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.fantasia}</td>
                    <td className="px-4 py-3 text-gray-500">{r.razonSocial || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.cuit || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.canal || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[r.localidad, r.provincia].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.plazoPago ? PLAZOS[r.plazoPago] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.contactos?.length > 0 ? (
                        <div className="space-y-0.5">
                          {r.contactos.slice(0, 2).map((c, i) => (
                            <p key={i} className="text-xs text-gray-500">{c.nombre}</p>
                          ))}
                          {r.contactos.length > 2 && (
                            <p className="text-xs text-gray-400">+{r.contactos.length - 2} más</p>
                          )}
                        </div>
                      ) : <span className="text-gray-300 text-xs">Sin contactos</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/representaciones/${r._id}/editar`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        {usuario.rol === 'admin' && r.activa && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Desactivar ${r.fantasia}?`)) desactivar(r._id)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Desactivar"
                          >
                            <PowerOff size={15} />
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