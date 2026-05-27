import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/auth.store'
import {
  LayoutDashboard, Users, ShoppingCart, FileText,
  Wallet, Receipt, TrendingUp, Truck, LogOut,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/clientes',     label: 'Clientes',     icon: Users },
  { to: '/ventas',       label: 'Ventas',       icon: ShoppingCart },
  { to: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { to: '/tesoreria',    label: 'Tesorería',    icon: Wallet },
  { to: '/gastos',       label: 'Gastos',       icon: Receipt },
  { to: '/comisiones',   label: 'Comisiones',   icon: TrendingUp },
  { to: '/proveedores',  label: 'Proveedores',  icon: Truck },
]

export default function MainLayout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">ERP Sistema</h1>
          <p className="text-xs text-gray-500 mt-0.5">{usuario?.nombre}</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
