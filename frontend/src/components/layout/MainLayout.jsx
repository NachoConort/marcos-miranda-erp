import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/auth.store'
import {
  LayoutDashboard, Users, ShoppingCart, FileText,
  Wallet, Receipt, TrendingUp, Truck, Building2,
  LogOut, ClipboardList, Package, ChevronLeft,
  ChevronRight, ChevronDown, ChevronUp,
  CreditCard, ArrowLeftRight, FileCheck,
} from 'lucide-react'

const navConfig = [
  {
    type: 'link',
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    type: 'group',
    label: 'Facturación',
    icon: FileCheck,
    items: [
      { to: '/ventas',       label: 'Ventas',       icon: ShoppingCart },
      { to: '/presupuestos', label: 'Presupuestos', icon: FileText     },
      { to: '/pedidos',      label: 'Pedidos',      icon: ClipboardList},
    ],
  },
  {
    type: 'group',
    label: 'Tesorería',
    icon: Wallet,
    items: [
      { to: '/tesoreria/caja',          label: 'Caja diaria',    icon: Receipt         },
      { to: '/tesoreria/transferencias', label: 'Transferencias', icon: ArrowLeftRight  },
      { to: '/tesoreria/cheques',        label: 'Cheques',        icon: CreditCard      },
    ],
  },
  {
    type: 'group',
    label: 'Base de datos',
    icon: Package,
    items: [
      { to: '/productos',        label: 'Productos',        icon: Package   },
      { to: '/clientes',         label: 'Clientes',         icon: Users     },
      { to: '/representaciones', label: 'Representaciones', icon: Building2 },
    ],
  },
  {
    type: 'group',
    label: 'Otros',
    icon: TrendingUp,
    items: [
      { to: '/comisiones',  label: 'Comisiones',  icon: TrendingUp },
      { to: '/proveedores', label: 'Proveedores', icon: Truck      },
      { to: '/gastos',      label: 'Gastos',      icon: Receipt    },
    ],
  },
]

const getInitials = (nombre) =>
  nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

// Devuelve el label de la página actual para el topbar
const getLabelActual = (pathname) => {
  for (const item of navConfig) {
    if (item.type === 'link' && pathname.startsWith(item.to)) return item.label
    if (item.type === 'group') {
      for (const sub of item.items) {
        if (pathname.startsWith(sub.to)) return sub.label
      }
    }
  }
  return ''
}

// Devuelve qué grupos deben estar abiertos según la ruta actual
const getGruposIniciales = (pathname) => {
  const abiertos = {}
  navConfig.forEach((item) => {
    if (item.type === 'group') {
      const activo = item.items.some((sub) => pathname.startsWith(sub.to))
      if (activo) abiertos[item.label] = true
    }
  })
  return abiertos
}

export default function MainLayout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [gruposAbiertos, setGruposAbiertos] = useState(
    () => getGruposIniciales(location.pathname)
  )

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleGrupo = (label) => {
    setGruposAbiertos((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const labelActual = getLabelActual(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-200 overflow-hidden"
        style={{
          width: sidebarVisible ? '224px' : '0px',
          background: '#1a1f2e',
          borderRight: sidebarVisible ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white font-medium text-sm whitespace-nowrap">Marcos Miranda</p>
          <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Sistema de gestión
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navConfig.map((item) => {
            if (item.type === 'link') {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                    }`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              )
            }

            if (item.type === 'group') {
              const abierto = !!gruposAbiertos[item.label]
              const tieneActivo = item.items.some((sub) => location.pathname.startsWith(sub.to))

              return (
                <div key={item.label} className="mb-0.5">
                  {/* Header del grupo */}
                  <button
                    onClick={() => toggleGrupo(item.label)}
                    className={`w-full flex items-center justify-between mx-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                      tieneActivo
                        ? 'text-white/90'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                    }`}
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    {abierto
                      ? <ChevronUp size={13} className="flex-shrink-0" />
                      : <ChevronDown size={13} className="flex-shrink-0" />
                    }
                  </button>

                  {/* Items del grupo */}
                  {abierto && (
                    <div className="ml-2 mt-0.5 mb-1">
                      {item.items.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 mx-2 pl-5 pr-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75'
                            }`
                          }
                        >
                          <sub.icon size={14} />
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return null
          })}
        </nav>

        {/* Usuario */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {getInitials(usuario?.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate whitespace-nowrap">{usuario?.nombre}</p>
              <p className="text-xs capitalize whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {usuario?.rol}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Botón toggle sidebar */}
            <button
              onClick={() => setSidebarVisible((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              title={sidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}
            >
              {sidebarVisible
                ? <ChevronLeft size={18} />
                : <ChevronRight size={18} />
              }
            </button>
            {labelActual && (
              <h1 className="text-sm font-medium text-gray-900">{labelActual}</h1>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
        </header>

        {/* Página actual */}
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}