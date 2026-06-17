import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ventasService } from '@/services/ventas.service'
import { Plus } from 'lucide-react'
import useAuthStore from '@/store/auth.store'
import SearchSelect from '@/components/shared/SearchSelect'
import { useQuery as useRQQuery } from '@tanstack/react-query'
import api from '@/services/api'

const ESTADOS = {
  pendiente:      { label: 'Pendiente',       class: 'bg-yellow-100 text-yellow-800' },
  cobrado_parcial:{ label: 'Cobro parcial',   class: 'bg-orange-100 text-orange-800' },
  cobrado:        { label: 'Cobrado',         class: 'bg-green-100 text-green-800'   },
  cancelado:      { label: 'Cancelado',       class: 'bg-red-100 text-red-800'       },
}

const PROVINCIAS_AR = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR')

const FILTROS_INICIALES = {
  fechaDesde: '', fechaHasta: '', estado: '',
  tipoComprobante: '', numeroComprobante: '',
  formaPago: '', condicionPago: '', cobroPendiente: '',
  estadoRemito: '', provincia: '',
}

export default function VentasPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', filtros],
    queryFn: () => ventasService.getAll(
      Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))
    ),
  })

  const { mutate: cancelar } = useMutation({
    mutationFn: (id) => ventasService.cancelar(id),
    onSuccess: () => queryClient.invalidateQueries(['ventas']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  const set = (key) => (val) => setFiltros((f) => ({ ...f, [key]: val }))
  const setE = (key) => (e) => setFiltros((f) => ({ ...f, [key]: e.target.value }))
  const limpiar = () => setFiltros(FILTROS_INICIALES)

  const opProvincias = PROVINCIAS_AR.map((p) => ({ value: p, label: p }))

  const cantFiltrosActivos = Object.values(filtros).filter((v) => v !== '').length

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ventas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} registros</p>
        </div>
        <button onClick={() => navigate('/ventas/nueva')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      {/* Filtros fijos */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
          {cantFiltrosActivos > 0 && (
            <button onClick={limpiar} className="text-xs text-blue-600 hover:underline">
              Limpiar filtros ({cantFiltrosActivos})
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {/* Fechas */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha desde</label>
            <input type="date" value={filtros.fechaDesde} onChange={setE('fechaDesde')} className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha hasta</label>
            <input type="date" value={filtros.fechaHasta} onChange={setE('fechaHasta')} className="input" />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={filtros.estado} onChange={setE('estado')} className="input">
              <option value="">Todos</option>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo comprobante */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo comprobante</label>
            <select value={filtros.tipoComprobante} onChange={setE('tipoComprobante')} className="input">
              <option value="">Todos</option>
              <option value="factura">Factura</option>
              <option value="comprobante">Comprobante</option>
            </select>
          </div>

          {/* Número comprobante */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nº comprobante</label>
            <input
              type="number"
              value={filtros.numeroComprobante}
              onChange={setE('numeroComprobante')}
              placeholder="00000001"
              className="input"
            />
          </div>

          {/* Forma de pago */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
            <select value={filtros.formaPago} onChange={setE('formaPago')} className="input">
              <option value="">Todas</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cuenta_corriente">Cuenta corriente</option>
            </select>
          </div>

          {/* Condición de pago */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Condición de pago</label>
            <select value={filtros.condicionPago} onChange={setE('condicionPago')} className="input">
              <option value="">Todas</option>
              <option value="contado">Contado</option>
              <option value="15_dias">15 días</option>
              <option value="30_dias">30 días</option>
              <option value="60_dias">60 días</option>
              <option value="90_dias">90 días</option>
            </select>
          </div>

          {/* Estado remito */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado remito</label>
            <select value={filtros.estadoRemito} onChange={setE('estadoRemito')} className="input">
              <option value="">Todos</option>
              <option value="sin_remito">Sin remito</option>
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>

          {/* Cobro pendiente */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cobro pendiente</label>
            <select value={filtros.cobroPendiente} onChange={setE('cobroPendiente')} className="input">
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Provincia */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provincia</label>
            <SearchSelect
              options={opProvincias}
              value={filtros.provincia}
              onChange={set('provincia')}
              placeholder="Buscar provincia..."
            />
          </div>
        </div>
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
                    <td className="px-4 py-3 font-medium text-gray-800">{v.cliente?.nombre || v.cliente?.razonSocial}</td>
                    <td className="px-4 py-3 text-gray-500">{v.representacion?.fantasia || v.representacion?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{v.vendedor?.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {v.comprobante?.tipo ? (
                        <span>
                          {v.comprobante.tipo === 'factura' ? 'FC' : 'CB'}{' '}
                          {String(v.comprobante.numero || '').padStart(8, '0')}
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
                      {!['cobrado', 'cancelado'].includes(v.estado) && (
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar esta venta?')) cancelar(v._id)
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
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