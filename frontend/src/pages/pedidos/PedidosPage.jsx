import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { pedidosService } from '@/services/pedidos.service'
import { Plus, Trash2, CheckCircle, Send, ShoppingBag } from 'lucide-react'

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  class: 'bg-yellow-100 text-yellow-800' },
  enviado:    { label: 'Enviado',    class: 'bg-blue-100 text-blue-800'     },
  completado: { label: 'Completado', class: 'bg-green-100 text-green-800'   },
  cancelado:  { label: 'Cancelado',  class: 'bg-red-100 text-red-800'       },
}

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR')

export default function PedidosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos', filtroEstado],
    queryFn: () => pedidosService.getAll({ estado: filtroEstado || undefined }),
  })

  const { mutate: cambiarEstado } = useMutation({
    mutationFn: ({ id, estado }) => pedidosService.cambiarEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries(['pedidos']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => pedidosService.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries(['pedidos']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pedidos</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        <button
          onClick={() => navigate('/pedidos/nuevo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2">
        {[
          { value: '',           label: 'Todos'      },
          { value: 'pendiente',  label: 'Pendientes' },
          { value: 'enviado',    label: 'Enviados'   },
          { value: 'completado', label: 'Completados'},
          { value: 'cancelado',  label: 'Cancelados' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filtroEstado === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.pedidos?.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No hay pedidos registrados</p>
            <button
              onClick={() => navigate('/pedidos/nuevo')}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Representación</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.pedidos?.map((p) => (
                <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{p.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.cliente?.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.representacion?.nombre}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(p.total)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatFecha(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ESTADOS[p.estado]?.class}`}>
                      {ESTADOS[p.estado]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {p.estado === 'pendiente' && (
                        <button
                          onClick={() => cambiarEstado({ id: p._id, estado: 'enviado' })}
                          title="Marcar como enviado a la representación"
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <Send size={11} /> Enviar
                        </button>
                      )}
                      {['pendiente', 'enviado'].includes(p.estado) && (
                        <>
                          <button
                            onClick={() => navigate(`/ventas/nueva?pedido=${p._id}`)}
                            title="La representación confirmó — crear venta"
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle size={11} /> Confirmar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este pedido?')) eliminar(p._id)
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Eliminar pedido"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}