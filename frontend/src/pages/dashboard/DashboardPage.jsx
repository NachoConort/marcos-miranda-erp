import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { DollarSign, FileText, TrendingUp, Receipt } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const formatFecha = (d) => new Date(d).toLocaleDateString('es-AR')

const ESTADOS = {
  pendiente: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
  cobrada:   { label: 'Cobrada',   class: 'bg-green-100 text-green-800'  },
  cancelada: { label: 'Cancelada', class: 'bg-red-100 text-red-800'      },
}

const StatCard = ({ label, value, sub, icon: Icon, iconColor }) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-medium text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
  </div>
)

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reportes/dashboard').then((r) => r.data.data),
  })

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Ventas del mes"
          value={isLoading ? '...' : formatMoney(data?.ventasMes?.total)}
          sub={`${data?.ventasMes?.cantidad ?? 0} operaciones`}
          icon={DollarSign}
          iconColor="bg-blue-500"
        />
        <StatCard
          label="Presupuestos activos"
          value={isLoading ? '...' : (data?.presupuestosActivos ?? 0)}
          sub="enviados o aprobados"
          icon={FileText}
          iconColor="bg-violet-500"
        />
        <StatCard
          label="Comisiones pendientes"
          value={isLoading ? '...' : formatMoney(data?.comisionesPendientes)}
          sub="por liquidar"
          icon={TrendingUp}
          iconColor="bg-amber-500"
        />
        <StatCard
          label="Gastos del mes"
          value={isLoading ? '...' : formatMoney(data?.gastosMes)}
          sub="gastos operativos"
          icon={Receipt}
          iconColor="bg-red-400"
        />
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Últimas ventas */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Últimas ventas</h3>
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : data?.ventasRecientes?.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data?.ventasRecientes?.map((v) => (
                  <tr key={v._id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-400 text-xs font-mono">#{v.numero}</td>
                    <td className="py-2 text-gray-800">{v.cliente?.nombre}</td>
                    <td className="py-2 font-medium text-right">{formatMoney(v.total)}</td>
                    <td className="py-2 pl-3">
                      <span className={`badge ${ESTADOS[v.estado]?.class}`}>
                        {ESTADOS[v.estado]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ventas por empresa */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Ventas por empresa</h3>
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : data?.ventasPorEmpresa?.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {data?.ventasPorEmpresa?.map((e) => {
                const max = data.ventasPorEmpresa[0]?.total || 1
                const pct = Math.round((e.total / max) * 100)
                return (
                  <div key={e._id} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-right text-xs text-gray-500 truncate">{e.nombre}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">{formatMoney(e.total)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
