import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/services/api'
import { DollarSign, ShoppingCart, TrendingDown, Clock } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-gray-500">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
  </div>
)

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reportes/dashboard').then((r) => r.data.data),
  })

  const formatMoney = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-5">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Ventas del mes" value={formatMoney(data?.ventasMes?.total)} icon={DollarSign} color="bg-blue-500" />
        <StatCard title="Cantidad de ventas" value={data?.ventasMes?.cantidad ?? '-'} icon={ShoppingCart} color="bg-green-500" />
        <StatCard title="Gastos del mes" value={formatMoney(data?.gastosMes)} icon={TrendingDown} color="bg-red-500" />
        <StatCard title="Resultado" value={formatMoney((data?.ventasMes?.total ?? 0) - (data?.gastosMes ?? 0))} icon={Clock} color="bg-purple-500" />
      </div>

      {/* Tabla de ventas recientes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Últimas ventas</h3>
        {isLoading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data?.ventasRecientes?.map((v) => (
                <tr key={v._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">#{v.numero}</td>
                  <td className="py-2">{v.cliente?.nombre ?? '-'}</td>
                  <td className="py-2 font-medium">{formatMoney(v.total)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.estado === 'cobrada' ? 'bg-green-100 text-green-700' :
                      v.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {v.estado}
                    </span>
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
