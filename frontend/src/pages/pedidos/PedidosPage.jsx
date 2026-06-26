import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { pedidosService } from "@/services/pedidos.service";
import { Plus, CheckCircle, Send, XCircle, ShoppingBag } from "lucide-react";

const ESTADOS = {
  pendiente: { label: "Pendiente", class: "bg-yellow-100 text-yellow-800" },
  enviado: { label: "Enviado", class: "bg-blue-100 text-blue-800" },
  completado: { label: "Completado", class: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", class: "bg-red-100 text-red-800" },
};

const CONFIRMACIONES = {
  enviado: "¿Confirmar que el pedido fue enviado a la representación?",
  cancelado:
    "¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.",
  confirmar:
    "¿La representación confirmó el pedido? Esto te llevará a crear la venta.",
};

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatFecha = (d) => new Date(d).toLocaleDateString("es-AR");

export default function PedidosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pedidos", filtroEstado],
    queryFn: () => pedidosService.getAll({ estado: filtroEstado || undefined }),
  });

  const { mutate: cambiarEstado } = useMutation({
    mutationFn: ({ id, estado }) => pedidosService.cambiarEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries(["pedidos"]),
    onError: (err) => alert(err.response?.data?.message || "Error"),
  });

  const handleAccion = (pedido, accion) => {
    if (accion === "confirmar") {
      if (!confirm(CONFIRMACIONES.confirmar)) return;
      navigate(`/ventas/nueva?pedido=${pedido._id}`);
      return;
    }
    if (!confirm(CONFIRMACIONES[accion])) return;
    cambiarEstado({ id: pedido._id, estado: accion });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pedidos</h2>
          <p className="text-xs text-gray-500">{data?.total ?? 0} registros</p>
        </div>
        <button
          onClick={() => navigate("/pedidos/nuevo")}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Nuevo pedido
        </button>
      </div>

      <div className="flex gap-1.5">
        {[
          { value: "", label: "Todos" },
          { value: "pendiente", label: "Pendientes" },
          { value: "enviado", label: "Enviados" },
          { value: "completado", label: "Completados" },
          { value: "cancelado", label: "Cancelados" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              filtroEstado === f.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card-compact p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-gray-400">
            Cargando...
          </div>
        ) : data?.pedidos?.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag size={26} className="text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay pedidos registrados</p>
            <button
              onClick={() => navigate("/pedidos/nuevo")}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-[10px] text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Repr.</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Neto</th>
                <th className="px-3 py-2 font-medium">IVA</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data?.pedidos?.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-3 py-1.5 text-gray-400 font-mono">
                    #{p.numero}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {p.cliente?.fantasia || p.cliente?.razonSocial}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">
                    {p.representacion?.fantasia || p.representacion?.nombre}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`badge text-[10px] ${p.tipoFacturacion === "facturado" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {p.tipoFacturacion === "facturado" ? "Fact." : "Compr."}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {formatMoney(p.subtotalNeto)}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">
                    {p.tipoFacturacion === "facturado"
                      ? formatMoney(p.totalIva)
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 font-medium">
                    {formatMoney(p.total)}
                  </td>
                  <td className="px-3 py-1.5 text-gray-400">
                    {formatFecha(p.createdAt)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`badge text-[10px] ${ESTADOS[p.estado]?.class}`}
                    >
                      {ESTADOS[p.estado]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {p.estado === "pendiente" && (
                        <button
                          onClick={() => handleAccion(p, "enviado")}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-0.5"
                        >
                          <Send size={9} /> Enviar
                        </button>
                      )}
                      {["pendiente", "enviado"].includes(p.estado) && (
                        <>
                          <button
                            onClick={() => handleAccion(p, "confirmar")}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-0.5"
                          >
                            <CheckCircle size={9} /> Confirmar
                          </button>
                          <button
                            onClick={() => handleAccion(p, "cancelado")}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-0.5"
                          >
                            <XCircle size={9} /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
