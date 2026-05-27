import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/auth.store'
import MainLayout from '@/components/layout/MainLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ClientesPage from '@/pages/clientes/ClientesPage'
import VentasPage from '@/pages/ventas/VentasPage'
import PresupuestosPage from '@/pages/presupuestos/PresupuestosPage'
import TesoreraPage from '@/pages/tesoreria/TesoreraPage'
import GastosPage from '@/pages/gastos/GastosPage'
import ComisionesPage from '@/pages/comisiones/ComisionesPage'
import ProveedoresPage from '@/pages/proveedores/ProveedoresPage'

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="presupuestos" element={<PresupuestosPage />} />
        <Route path="tesoreria" element={<TesoreraPage />} />
        <Route path="gastos" element={<GastosPage />} />
        <Route path="comisiones" element={<ComisionesPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
