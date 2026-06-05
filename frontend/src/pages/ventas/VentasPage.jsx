import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ventasService } from '@/services/ventas.service'
import { Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import useAuthStore from '@/store/auth.store'

const ESTADOS = {
  pedido:     { label: 'Pedido',     class: 'bg-blue-100 text-blue-800'   },
  confirmado: { label: 'Confirmado', class: 'bg-purple-100 text-purple-800' },
  facturado:  { label: 'Facturado',  class: 'bg-yellow-100 text-yellow-800' },
  cobrado:    { label: 'Cobrado',    class: 'bg-green-100 text-green-800'  },
  cancelado:  { label: 'Cancelado',  class: 'bg-red-100 text-red-800'     },
}

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR')

const FILTROS_INICIALES = {
  fechaDesde: '', fechaHasta: '', cliente: '', estado: '',
  tipoComprobante: '', letraComprobante: '', puntoVenta: '',
  numeroComprobante: '', vendedor: '', formaPago: '',
  validacionAfip: '', estadoRemito: '', provincia: '',
  condicionPago: '', cobroPendiente: '',
}

export default function VentasPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtrosActivos, setFiltrosActivos] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', filtrosActivos],
    queryFn: () => ventasService.getAll(filtrosActivos),
  })

  const { mutate: cambiarEstado } = useMutation({
    mutationFn: ({ id, accion, payload }) => ventasService[accion](id, payload),
    onSuccess: () => queryClient.invalidateQueries(['ventas']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  const aplicarFiltros = () => {
    const activos = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '')
    )
    setFiltrosActivos(activos)
    setFiltrosAbiertos(false)
  }

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES)
    setFiltrosActivos({})
  }

  const cantidadFiltrosActivos = Object.keys(filtrosActivos).length

  const set = (key) => (e) => setFiltros((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ventas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        <button
          onClick={() => navigate('/ventas/nueva')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="card p-0 overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search size={15} className="text-gray-400" />
            <span className="font-medium">Filtros</span>
            {cantidadFiltrosActivos > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {cantidadFiltrosActivos}
              </span>
            )}
          </div>
          {filtrosAbiertos ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {filtrosAbiertos && (
          <div className="border-t border-gray-100 p-4">
            <div className="grid grid-cols-4 gap-3">
              {/* Fechas */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha desde</label>
                <input type="date" value={filtros.fechaDesde} onChange={set('fechaDesde')} className="input" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha hasta</label>
                <input type="date" value={filtros.fechaHasta} onChange={set('fechaHasta')} className="input" />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado</label>
                <select value={filtros.estado} onChange={set('estado')} className="input">
                  <option value="">Todos</option>
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Forma de pago */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
                <select value={filtros.formaPago} onChange={set('formaPago')} className="input">
                  <option value="">Todas</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cuenta_corriente">Cuenta corriente</option>
                </select>
              </div>

              {/* Comprobante */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo comprobante</label>
                <select value={filtros.tipoComprobante} onChange={set('tipoComprobante')} className="input">
                  <option value="">Todos</option>
                  <option value="factura">Factura</option>
                  <option value="comprobante">Comprobante</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Letra</label>
                <select value={filtros.letraComprobante} onChange={set('letraComprobante')} className="input">
                  <option value="">Todas</option>
                  {['A','B','C','X'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Punto de venta</label>
                <input type="number" value={filtros.puntoVenta} onChange={set('puntoVenta')} className="input" placeholder="0001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nº comprobante</label>
                <input type="number" value={filtros.numeroComprobante} onChange={set('numeroComprobante')} className="input" placeholder="00000001" />
              </div>

              {/* AFIP y remito */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Validación AFIP</label>
                <select value={filtros.validacionAfip} onChange={set('validacionAfip')} className="input">
                  <option value="">Todas</option>
                  <option value="validada">Validada</option>
                  <option value="no_validada">No validada</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado remito</label>
                <select value={filtros.estadoRemito} onChange={set('estadoRemito')} className="input">
                  <option value="">Todos</option>
                  <option value="sin_remito">Sin remito</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Condición de pago</label>
                <select value={filtros.condicionPago} onChange={set('condicionPago')} className="input">
                  <option value="">Todas</option>
                  <option value="contado">Contado</option>
                  <option value="15_dias">15 días</option>
                  <option value="30_dias">30 días</option>
                  <option value="60_dias">60 días</option>
                  <option value="90_dias">90 días</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cobro pendiente</label>
                <select value={filtros.cobroPendiente} onChange={set('cobroPendiente')} className="input">
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Provincia */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Provincia</label>
                <input type="text" value={filtros.provincia} onChange={set('provincia')} className="input" placeholder="Tucumán..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={limpiarFiltros} className="btn-secondary flex items-center gap-1.5">
                <X size={14} /> Limpiar
              </button>
              <button onClick={aplicarFiltros} className="btn-primary flex items-center gap-1.5">
                <Search size={14} /> Buscar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.ventas?.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No hay ventas con esos filtros</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Representación</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Comprobante</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Comisión</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.ventas?.map((v) => (
                  <tr key={v._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{v.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{v.cliente?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{v.representacion?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{v.vendedor?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {v.comprobante?.tipo ? (
                        <span>
                          {v.comprobante.tipo === 'factura' ? 'FC' : 'CB'} {v.comprobante.letra}{' '}
                          {v.comprobante.puntoVenta?.toString().padStart(4, '0')}-
                          {v.comprobante.numero?.toString().padStart(8, '0')}
                        </span>
                      ) : (
                        <span className="text-gray-300">Sin comprobante</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatMoney(v.total)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {v.comision ? formatMoney(v.comision.montoComision) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatFecha(v.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ESTADOS[v.estado]?.class}`}>
                        {ESTADOS[v.estado]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {v.estado === 'pedido' && (
                          <button
                            onClick={() => cambiarEstado({ id: v._id, accion: 'confirmar', payload: {} })}
                            className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                          >
                            Confirmar
                          </button>
                        )}
                        {v.estado === 'confirmado' && (
                          <button
                            onClick={() => cambiarEstado({ id: v._id, accion: 'facturar', payload: {} })}
                            className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                          >
                            Facturar
                          </button>
                        )}
                        {v.estado === 'facturado' && (
                          <button
                            onClick={() => cambiarEstado({ id: v._id, accion: 'cobrar' })}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            Cobrar
                          </button>
                        )}
                        {!['cobrado', 'cancelado'].includes(v.estado) && (
                          <button
                            onClick={() => {
                              if (confirm('¿Cancelar esta venta?'))
                                cambiarEstado({ id: v._id, accion: 'cancelar' })
                            }}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Cancelar
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