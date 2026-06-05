import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/auth.store'
import {
  LayoutDashboard, Users, ShoppingCart, FileText,
  Wallet, Receipt, TrendingUp, Truck, Building2,
  LogOut, ClipboardList, Package,
} from 'lucide-react'

const navSections = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { to: '/clientes',     label: 'Clientes',     icon: Users },
      { to: '/presupuestos', label: 'Presupuestos', icon: FileText },
      { to: '/pedidos',      label: 'Pedidos',      icon: ClipboardList },
      { to: '/ventas',       label: 'Ventas',       icon: ShoppingCart },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/tesoreria',  label: 'Tesorería',  icon: Wallet },
      { to: '/gastos',     label: 'Gastos',     icon: Receipt },
      { to: '/comisiones', label: 'Comisiones', icon: TrendingUp },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/representaciones', label: 'Representaciones', icon: Building2 },
      { to: '/productos',        label: 'Productos',        icon: Package  },
      { to: '/proveedores',      label: 'Proveedores',      icon: Truck    },
    ],
  },
]

const getInitials = (nombre) =>
  nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

export default function MainLayout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#1a1f2e' }}>
        <div className="px-5 py-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white font-medium text-sm">Marcos Miranda</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Sistema de gestión</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="px-5 py-2 text-xs font-medium uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                {section.label}
              </p>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {getInitials(usuario?.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">{usuario?.nombre}</p>
              <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>{usuario?.rol}</p>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors" title="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-medium text-gray-900">
            {navSections.flatMap((s) => s.items).find((i) => location.pathname.startsWith(i.to))?.label ?? 'Dashboard'}
          </h1>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}