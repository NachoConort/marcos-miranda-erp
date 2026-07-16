import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { presupuestosService } from "@/services/presupuestos.service";
import { calcularResumenImpositivo } from "@/components/shared/ResumenImpositivo";
import { generarPdfPresupuesto } from "@/utils/presupuestoPdf";
import api from "@/services/api";
import {
  FileText,
  Download,
  Send,
  Pencil,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Plus,
  
} from "lucide-react";

const ESTADOS = {
  no_enviado: { label: "No enviado", class: "bg-gray-100 text-gray-600" },
  enviado: { label: "Enviado", class: "bg-blue-100 text-blue-700" },
  convertido: { label: "Convertido", class: "bg-green-100 text-green-700" },
  rechazado: { label: "Rechazado", class: "bg-red-100 text-red-700" },
  vencido: { label: "Vencido", class: "bg-yellow-100 text-yellow-700" },
};

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatFecha = (d) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");

export default function PresupuestosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtros, setFiltros] = useState({ fechaDesde: "", fechaHasta: "" });
  const [filtrosActivos, setFiltrosActivos] = useState({});
  const [generandoPdf, setGenerandoPdf] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["presupuestos", filtroEstado, filtrosActivos],
    queryFn: () =>
      presupuestosService.getAll({
        estado: filtroEstado || undefined,
        ...filtrosActivos,
      }),
  });

  const { mutate: cambiarEstado } = useMutation({
    mutationFn: ({ id, estado }) =>
      presupuestosService.cambiarEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries(["presupuestos"]),
    onError: (err) => alert(err.response?.data?.message || "Error"),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => presupuestosService.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries(["presupuestos"]),
    onError: (err) => alert(err.response?.data?.message || "Error"),
  });

  const aplicarFiltros = () => {
    const activos = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== ""),
    );
    setFiltrosActivos(activos);
    setFiltrosAbiertos(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Presupuestos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total ?? 0} registros
          </p>
        </div>
        <button
          onClick={() => navigate("/presupuestos/nuevo")}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo presupuesto
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "Todos" },
          ...Object.entries(ESTADOS).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filtroEstado === f.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1 ml-auto"
        >
          Fechas{" "}
          {filtrosAbiertos ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>
      </div>

      {filtrosAbiertos && (
        <div className="card py-3">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))
                }
                className="input"
              />
            </div>
            <button onClick={aplicarFiltros} className="btn-primary">
              Aplicar
            </button>
            <button
              onClick={() => {
                setFiltros({ fechaDesde: "", fechaHasta: "" });
                setFiltrosActivos({});
              }}
              className="btn-secondary"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Cargando...
          </div>
        ) : data?.presupuestos?.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No hay presupuestos registrados
            </p>
            <button
              onClick={() => navigate("/presupuestos/nuevo")}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Representación</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Neto</th>
                  <th className="px-4 py-3 font-medium">IVA</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.presupuestos?.map((p) => {
                  const { importeNeto, totalIva } = calcularResumenImpositivo(
                    p.items,
                    p.descuentoGlobal,
                  );
                  return (
                    <tr
                      key={p._id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        #{p.numero}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatFecha(p.fechaComprobante)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {p.cliente?.fantasia || p.cliente?.razonSocial}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.representacion?.fantasia}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.vendedor?.nombre}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatMoney(importeNeto)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatMoney(totalIva)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(p.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ESTADOS[p.estado]?.class}`}>
                          {ESTADOS[p.estado]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {p.estado !== "convertido" && (
                            <>
                              {/* Ver PDF */}
                              <button
                                onClick={async () => {
                                  setGenerandoPdf(p._id);
                                  try {
                                    // Cargar el presupuesto completo con todos los datos
                                    const { presupuesto } = await api
                                      .get(`/presupuestos/${p._id}`)
                                      .then((r) => r.data);
                                    await generarPdfPresupuesto(
                                      presupuesto,
                                      false,
                                    );
                                  } catch (e) {
                                    alert("Error al generar el PDF");
                                  } finally {
                                    setGenerandoPdf(null);
                                  }
                                }}
                                disabled={generandoPdf === p._id}
                                className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                                title="Ver PDF"
                              >
                                {generandoPdf === p._id ? (
                                  "..."
                                ) : (
                                  <FileText size={13} />
                                )}
                              </button>

                              {/* Descargar PDF */}
                              <button
                                onClick={async () => {
                                  setGenerandoPdf(`dl-${p._id}`);
                                  try {
                                    const { presupuesto } = await api
                                      .get(`/presupuestos/${p._id}`)
                                      .then((r) => r.data);
                                    await generarPdfPresupuesto(
                                      presupuesto,
                                      true,
                                    );
                                  } catch (e) {
                                    alert("Error al descargar el PDF");
                                  } finally {
                                    setGenerandoPdf(null);
                                  }
                                }}
                                disabled={generandoPdf === `dl-${p._id}`}
                                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                title="Descargar PDF"
                              >
                                {generandoPdf === `dl-${p._id}` ? (
                                  "..."
                                ) : (
                                  <Download size={13} />
                                )}
                              </button>

                              {/* Enviar */}
                              {p.estado === "no_enviado" && (
                                <button
                                  onClick={() =>
                                    cambiarEstado({
                                      id: p._id,
                                      estado: "enviado",
                                    })
                                  }
                                  className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                                  title="Marcar como enviado"
                                >
                                  <Send size={13} />
                                </button>
                              )}

                              {/* Convertir en pedido */}
                              <button
                                onClick={() =>
                                  navigate(
                                    `/pedidos/nuevo?presupuesto=${p._id}`,
                                  )
                                }
                                className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                title="Convertir en pedido"
                              >
                                → Pedido
                              </button>

                              {/* Editar */}
                              <button
                                onClick={() =>
                                  navigate(`/presupuestos/${p._id}/editar`)
                                }
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Eliminar */}
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `¿Eliminar presupuesto #${p.numero}?`,
                                    )
                                  )
                                    eliminar(p._id);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}

                          {/* Si está convertido, solo permitir ver/descargar PDF */}
                          {p.estado === "convertido" && (
                            <button
                              onClick={async () => {
                                setGenerandoPdf(p._id);
                                try {
                                  const { presupuesto } = await api
                                    .get(`/presupuestos/${p._id}`)
                                    .then((r) => r.data);
                                  await generarPdfPresupuesto(
                                    presupuesto,
                                    false,
                                  );
                                } finally {
                                  setGenerandoPdf(null);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                            >
                              <FileText size={13} /> Ver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
