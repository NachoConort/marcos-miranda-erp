import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "@/store/auth.store";
import MainLayout from "@/components/layout/MainLayout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ClientesPage from "@/pages/clientes/ClientesPage";
import NuevoClientePage from "@/pages/clientes/NuevoClientePage";
import EditarClientePage from "@/pages/clientes/EditarClientePage";
import PresupuestosPage from "@/pages/presupuestos/PresupuestosPage";
import NuevoPresupuestoPage from "@/pages/presupuestos/NuevoPresupuestoPage";
import EditarPresupuestoPage from "@/pages/presupuestos/EditarPresupuestoPage";
import PedidosPage from "@/pages/pedidos/PedidosPage";
import NuevoPedidoPage from "@/pages/pedidos/NuevoPedidoPage";
import VentasPage from "@/pages/ventas/VentasPage";
import NuevaVentaPage from "@/pages/ventas/NuevaVentaPage";
import ProductosPage from "@/pages/productos/ProductosPage";
import NuevoProductoPage from "@/pages/productos/NuevoProductoPage";
import EditarProductoPage from "@/pages/productos/EditarProductoPage";
import TesoreraPage from "@/pages/tesoreria/TesoreraPage";
import GastosPage from "@/pages/gastos/GastosPage";
import ComisionesPage from "@/pages/comisiones/ComisionesPage";
import ProveedoresPage from "@/pages/proveedores/ProveedoresPage";
import RepresentacionesPage from "@/pages/representaciones/RepresentacionesPage";
import NuevaRepresentacionPage from "@/pages/representaciones/NuevaRepresentacionPage";
import EditarRepresentacionPage from "@/pages/representaciones/EditarRepresentacionPage";
import CajaDiariaPage from "@/pages/tesoreria/CajaDiariaPage";

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

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
        <Route path="clientes/nuevo" element={<NuevoClientePage />} />
        <Route path="clientes/:id/editar" element={<EditarClientePage />} />
        <Route path="presupuestos" element={<PresupuestosPage />} />
        <Route path="presupuestos/nuevo" element={<NuevoPresupuestoPage />} />
        <Route
          path="presupuestos/:id/editar"
          element={<EditarPresupuestoPage />}
        />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="pedidos/nuevo" element={<NuevoPedidoPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="ventas/nueva" element={<NuevaVentaPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="productos/nuevo" element={<NuevoProductoPage />} />
        <Route path="productos/:id/editar" element={<EditarProductoPage />} />
        <Route path="tesoreria" element={<TesoreraPage />} />
        <Route path="tesoreria/caja" element={<CajaDiariaPage />} />
        <Route path="gastos" element={<GastosPage />} />
        <Route path="comisiones" element={<ComisionesPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path="representaciones" element={<RepresentacionesPage />} />
        <Route
          path="representaciones/nueva"
          element={<NuevaRepresentacionPage />}
        />
        <Route
          path="representaciones/:id/editar"
          element={<EditarRepresentacionPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
