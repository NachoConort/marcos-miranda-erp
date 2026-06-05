import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { productosService } from '@/services/productos.service'
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Trash2, Package } from 'lucide-react'
import useAuthStore from '@/store/auth.store'

const IVA_LABELS = { 0: '0%', 10.5: '10.5%', 21: '21%', 27: '27%' }

const formatMoney = (n, moneda) => {
  const sym = moneda === 'dolar' ? 'USD ' : '$'
  return `${sym}${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n || 0)}`
}

export default function ProductosPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState('')
  const [filtroDisponible, setFiltroDisponible] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['productos', busquedaActiva, filtroDisponible],
    queryFn: () => productosService.getAll({
      busqueda: busquedaActiva || undefined,
      disponiblePara: filtroDisponible || undefined,
    }),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: (id) => productosService.toggleHabilitado(id),
    onSuccess: () => queryClient.invalidateQueries(['productos']),
  })

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => productosService.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries(['productos']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Productos</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        <button onClick={() => navigate('/productos/nuevo')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Búsqueda y filtros */}
      <div className="card py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setBusquedaActiva(busqueda)}
              placeholder="Buscar por nombre, código, código de barra o marca..."
              className="input pl-8"
            />
          </div>
          <select
            value={filtroDisponible}
            onChange={(e) => setFiltroDisponible(e.target.value)}
            className="input w-44"
          >
            <option value="">Todos</option>
            <option value="ventas">Para ventas</option>
            <option value="compras">Para compras</option>
          </select>
          <button onClick={() => setBusquedaActiva(busqueda)} className="btn-primary">Buscar</button>
          {(busquedaActiva || filtroDisponible) && (
            <button onClick={() => { setBusqueda(''); setBusquedaActiva(''); setFiltroDisponible('') }} className="btn-secondary">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.productos?.length === 0 ? (
          <div className="p-10 text-center">
            <Package size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No se encontraron productos</p>
            <button onClick={() => navigate('/productos/nuevo')} className="mt-3 text-sm text-blue-600 hover:underline">
              Agregar el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Rubro</th>
                  <th className="px-4 py-3 font-medium">Representaciones</th>
                  <th className="px-4 py-3 font-medium">Costo</th>
                  <th className="px-4 py-3 font-medium">IVA</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Disponible</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.productos?.map((p) => (
                  <tr key={p._id} className={`border-b border-gray-50 hover:bg-gray-50 ${!p.habilitado ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.nombre}</p>
                      {p.codigoBarra && <p className="text-xs text-gray-400 font-mono">{p.codigoBarra}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.marca || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <p>{p.rubro || '—'}</p>
                      {p.subRubro && <p className="text-xs text-gray-400">{p.subRubro}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.representaciones?.length > 0
                          ? p.representaciones.slice(0, 2).map((r) => (
                              <span key={r._id} className="badge bg-blue-50 text-blue-700 text-xs">
                                {r.fantasia || r.nombre}
                              </span>
                            ))
                          : <span className="text-gray-300 text-xs">Sin asignar</span>
                        }
                        {p.representaciones?.length > 2 && (
                          <span className="text-xs text-gray-400">+{p.representaciones.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatMoney(p.costo, p.moneda)}</td>
                    <td className="px-4 py-3 text-gray-500">{IVA_LABELS[p.porcentajeIva]}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.stockeable ? (
                        <span className={p.cantidadDisponible > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
                          {p.cantidadDisponible} {p.unidadMedida}
                        </span>
                      ) : <span className="text-gray-300 text-xs">No stockeable</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.disponiblePara?.map((d) => (
                          <span key={d} className={`badge text-xs ${d === 'ventas' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.habilitado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.habilitado ? 'Habilitado' : 'Deshabilitado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/productos/${p._id}/editar`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggle(p._id)}
                          className={`transition-colors ${p.habilitado ? 'text-green-500 hover:text-gray-400' : 'text-gray-400 hover:text-green-500'}`}
                          title={p.habilitado ? 'Deshabilitar' : 'Habilitar'}
                        >
                          {p.habilitado ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        {usuario.rol === 'admin' && (
                          <button
                            onClick={() => { if (confirm(`¿Eliminar ${p.nombre}?`)) eliminar(p._id) }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
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