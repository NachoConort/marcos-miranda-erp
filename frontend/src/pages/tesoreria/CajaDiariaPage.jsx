import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cajaService } from '@/services/caja.service'
import useAuthStore from '@/store/auth.store'
import { Plus, Lock, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n || 0)

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const formatHora = (d) => new Date(d).toLocaleTimeString('es-AR', {
  hour: '2-digit', minute: '2-digit',
})

export default function CajaDiariaPage() {
  const { usuario } = useAuthStore()
  const esAdmin = usuario?.rol === 'admin'
  const queryClient = useQueryClient()

  const [formMov, setFormMov] = useState({
    concepto: '', detalle: '', tipo: 'ingreso', monto: '',
  })
  const [formCierre, setFormCierre] = useState({ observacionCierre: '' })
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [mostrarFormMov, setMostrarFormMov] = useState(false)

  // Cargar caja del día
  const { data, isLoading } = useQuery({
    queryKey: ['caja-hoy'],
    queryFn: () => cajaService.getCajaHoy(),
    refetchInterval: 30000, // refrescar cada 30s
  })

  const caja = data?.caja
  const saldoSugerido = data?.saldoSugerido ?? 0
  const ultimaCaja = data?.ultimaCaja

  // Abrir caja
  const { mutate: abrir, isPending: abriendo } = useMutation({
    mutationFn: (saldoInicial) => cajaService.abrirCaja({ saldoInicial }),
    onSuccess: () => queryClient.invalidateQueries(['caja-hoy']),
    onError: (err) => alert(err.response?.data?.message || 'Error al abrir la caja'),
  })

  // Agregar movimiento
  const { mutate: agregarMov, isPending: agregando } = useMutation({
    mutationFn: (data) => cajaService.agregarMovimiento(caja._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['caja-hoy'])
      setFormMov({ concepto: '', detalle: '', tipo: 'ingreso', monto: '' })
      setMostrarFormMov(false)
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al agregar movimiento'),
  })

  // Eliminar movimiento
  const { mutate: eliminarMov } = useMutation({
    mutationFn: (movId) => cajaService.eliminarMovimiento(caja._id, movId),
    onSuccess: () => queryClient.invalidateQueries(['caja-hoy']),
    onError: (err) => alert(err.response?.data?.message || 'Error'),
  })

  // Cerrar caja
  const { mutate: cerrar, isPending: cerrando } = useMutation({
    mutationFn: () => cajaService.cerrarCaja(caja._id, formCierre),
    onSuccess: () => {
      queryClient.invalidateQueries(['caja-hoy'])
      setMostrarCierre(false)
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al cerrar la caja'),
  })

  const handleAgregarMov = () => {
    if (!formMov.concepto || !formMov.monto) return alert('Concepto y monto son requeridos')
    agregarMov(formMov)
  }

  const saldoActual = caja
    ? caja.movimientos.length > 0
      ? caja.movimientos[caja.movimientos.length - 1].saldo
      : caja.saldoInicial
    : 0

  const totalIngresos = caja?.movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + m.monto, 0) || 0

  const totalEgresos = caja?.movimientos
    .filter((m) => m.tipo === 'egreso')
    .reduce((acc, m) => acc + m.monto, 0) || 0

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>

  // Sin caja abierta hoy
  if (!caja) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-10">
        <div className="card text-center">
          <DollarSign size={40} className="text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-1">No hay caja abierta hoy</h2>
          {ultimaCaja && (
            <p className="text-sm text-gray-500 mb-1">
              Último cierre: {formatFecha(ultimaCaja.fecha)} —
              saldo final {formatMoney(ultimaCaja.saldoFinal)}
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            El saldo inicial sugerido es <span className="font-medium text-gray-700">{formatMoney(saldoSugerido)}</span>
          </p>

          <div className="flex items-center gap-3 justify-center">
            <input
              type="number"
              defaultValue={saldoSugerido}
              id="saldo-inicial"
              className="input w-40 text-center"
              placeholder="Saldo inicial"
            />
            <button
              onClick={() => {
                const val = Number(document.getElementById('saldo-inicial').value) || 0
                abrir(val)
              }}
              disabled={abriendo}
              className="btn-primary"
            >
              {abriendo ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Caja diaria</h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatFecha(caja.fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          {caja.estado === 'abierta' && (
            <button
              onClick={() => setMostrarFormMov(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Nuevo movimiento
            </button>
          )}
          {esAdmin && caja.estado === 'abierta' && (
            <button
              onClick={() => setMostrarCierre(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors"
            >
              <Lock size={15} /> Cerrar caja
            </button>
          )}
          {caja.estado === 'cerrada' && (
            <span className="badge bg-red-100 text-red-700 flex items-center gap-1.5">
              <Lock size={12} /> Caja cerrada — {formatHora(caja.fechaCierre)}
            </span>
          )}
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Saldo inicial</p>
          <p className="text-xl font-semibold text-gray-800">{formatMoney(caja.saldoInicial)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-500" /> Ingresos
          </p>
          <p className="text-xl font-semibold text-green-600">{formatMoney(totalIngresos)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <TrendingDown size={12} className="text-red-500" /> Egresos
          </p>
          <p className="text-xl font-semibold text-red-500">{formatMoney(totalEgresos)}</p>
        </div>
        <div className="card border-2 border-blue-100">
          <p className="text-xs text-gray-500 mb-1">
            {caja.estado === 'cerrada' ? 'Saldo final' : 'Saldo actual'}
          </p>
          <p className={`text-xl font-semibold ${saldoActual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatMoney(caja.estado === 'cerrada' ? caja.saldoFinal : saldoActual)}
          </p>
        </div>
      </div>

      {/* Formulario nuevo movimiento */}
      {mostrarFormMov && caja.estado === 'abierta' && (
        <div className="card border-blue-100 border">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Nuevo movimiento</h3>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
              <select
                value={formMov.tipo}
                onChange={(e) => setFormMov((f) => ({ ...f, tipo: e.target.value }))}
                className="input"
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
              <input
                value={formMov.concepto}
                onChange={(e) => setFormMov((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Ej: Venta al contado"
                className="input"
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarMov()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Detalle</label>
              <input
                value={formMov.detalle}
                onChange={(e) => setFormMov((f) => ({ ...f, detalle: e.target.value }))}
                placeholder="Detalle opcional"
                className="input"
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarMov()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto *</label>
              <input
                type="number"
                value={formMov.monto}
                onChange={(e) => setFormMov((f) => ({ ...f, monto: e.target.value }))}
                placeholder="0"
                className="input"
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarMov()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setMostrarFormMov(false); setFormMov({ concepto: '', detalle: '', tipo: 'ingreso', monto: '' }) }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button onClick={handleAgregarMov} disabled={agregando} className="btn-primary">
              {agregando ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium text-right">Ingreso</th>
              <th className="px-4 py-3 font-medium text-right">Egreso</th>
              <th className="px-4 py-3 font-medium text-right">Saldo</th>
              {esAdmin && caja.estado === 'abierta' && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {/* Fila saldo inicial */}
            <tr className="border-b border-gray-50 bg-blue-50/30">
              <td className="px-4 py-2.5 text-xs text-gray-400">—</td>
              <td className="px-4 py-2.5 text-sm font-medium text-gray-600">Saldo inicial</td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-right font-medium text-gray-700">{formatMoney(caja.saldoInicial)}</td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-right font-medium text-gray-700">{formatMoney(caja.saldoInicial)}</td>
              {esAdmin && caja.estado === 'abierta' && <td />}
            </tr>

            {caja.movimientos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  Sin movimientos — agregá el primero con el botón de arriba
                </td>
              </tr>
            ) : (
              caja.movimientos.map((mov) => (
                <tr key={mov._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{formatHora(mov.createdAt)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{mov.concepto}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{mov.detalle || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-xs ${
                      mov.origen === 'manual' ? 'bg-gray-100 text-gray-600' :
                      mov.origen === 'venta' ? 'bg-green-100 text-green-700' :
                      mov.origen === 'cobranza' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {mov.origen}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {mov.tipo === 'ingreso'
                      ? <span className="font-medium text-green-600">{formatMoney(mov.monto)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {mov.tipo === 'egreso'
                      ? <span className="font-medium text-red-500">{formatMoney(mov.monto)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${mov.saldo >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                    {formatMoney(mov.saldo)}
                  </td>
                  {esAdmin && caja.estado === 'abierta' && (
                    <td className="px-4 py-2.5 text-center">
                      {mov.origen === 'manual' && (
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este movimiento?')) eliminarMov(mov._id)
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}

            {/* Fila totales */}
            {caja.movimientos.length > 0 && (
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                <td colSpan={4} className="px-4 py-3 text-gray-600">Totales</td>
                <td className="px-4 py-3 text-right text-green-600">{formatMoney(totalIngresos)}</td>
                <td className="px-4 py-3 text-right text-red-500">{formatMoney(totalEgresos)}</td>
                <td className={`px-4 py-3 text-right ${saldoActual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatMoney(saldoActual)}
                </td>
                {esAdmin && caja.estado === 'abierta' && <td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info cierre */}
      {caja.estado === 'cerrada' && (
        <div className="card border border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-1">Caja cerrada</p>
          <p className="text-xs text-gray-500">
            Cerrada por <span className="font-medium">{caja.cerradaPor?.nombre}</span> a las {formatHora(caja.fechaCierre)}
          </p>
          {caja.observacionCierre && (
            <p className="text-xs text-gray-500 mt-1">Observación: {caja.observacionCierre}</p>
          )}
          <p className="text-sm font-semibold text-gray-800 mt-2">
            Saldo final: {formatMoney(caja.saldoFinal)}
          </p>
        </div>
      )}

      {/* Modal cierre */}
      {mostrarCierre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Cerrar caja</h3>
            <p className="text-sm text-gray-500 mb-4">
              El saldo final será <span className="font-semibold text-gray-800">{formatMoney(saldoActual)}</span> y
              será el saldo inicial del próximo día.
            </p>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Observación (opcional)</label>
              <textarea
                value={formCierre.observacionCierre}
                onChange={(e) => setFormCierre({ observacionCierre: e.target.value })}
                rows={3}
                className="input resize-none"
                placeholder="Ej: Todo cuadra con el efectivo real"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMostrarCierre(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => {
                  if (confirm(`¿Cerrar la caja con saldo final de ${formatMoney(saldoActual)}?`)) cerrar()
                }}
                disabled={cerrando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <Lock size={14} /> {cerrando ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}