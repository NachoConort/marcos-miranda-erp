import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ventasService } from "@/services/ventas.service";
import { calcularResumenImpositivo } from "@/components/shared/ResumenImpositivo";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import SearchSelect from "@/components/shared/SearchSelect";

const ESTADOS = {
  pendiente: { label: "Pendiente", class: "bg-yellow-100 text-yellow-800" },
  cobrado_parcial: {
    label: "Cobro parcial",
    class: "bg-orange-100 text-orange-800",
  },
  cobrado: { label: "Cobrado", class: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", class: "bg-red-100 text-red-800" },
};

const PROVINCIAS_AR = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatFecha = (d) => new Date(d).toLocaleDateString("es-AR");

const FILTROS_INICIALES = {
  fechaDesde: "",
  fechaHasta: "",
  estado: "",
  tipoComprobante: "",
  numeroComprobante: "",
  formaPago: "",
  condicionPago: "",
  cobroPendiente: "",
  estadoRemito: "",
  provincia: "",
};

export default function VentasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const { data, isLoading } = useQuery({
    queryKey: ["ventas", filtros],
    queryFn: () =>
      ventasService.getAll(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "")),
      ),
  });

  const { mutate: cancelar } = useMutation({
    mutationFn: (id) => ventasService.cancelar(id),
    onSuccess: () => queryClient.invalidateQueries(["ventas"]),
    onError: (err) => alert(err.response?.data?.message || "Error"),
  });

  const set = (key) => (val) => setFiltros((f) => ({ ...f, [key]: val }));
  const setE = (key) => (e) =>
    setFiltros((f) => ({ ...f, [key]: e.target.value }));
  const limpiar = () => setFiltros(FILTROS_INICIALES);

  const opProvincias = PROVINCIAS_AR.map((p) => ({ value: p, label: p }));
  const cantFiltrosActivos = Object.values(filtros).filter(
    (v) => v !== "",
  ).length;

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ventas</h2>
          <p className="text-xs text-gray-500">{data?.total ?? 0} registros</p>
        </div>
        <button
          onClick={() => navigate("/ventas/nueva")}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Nueva venta
        </button>
      </div>

      {/* Filtros siempre visibles */}
      <div className="card-compact">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Filtros
          </span>
          {cantFiltrosActivos > 0 && (
            <button
              onClick={limpiar}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpiar ({cantFiltrosActivos})
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="label-sm">Fecha desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={setE("fechaDesde")}
              className="input-sm"
            />
          </div>
          <div>
            <label className="label-sm">Fecha hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={setE("fechaHasta")}
              className="input-sm"
            />
          </div>
          <div>
            <label className="label-sm">Estado</label>
            <select
              value={filtros.estado}
              onChange={setE("estado")}
              className="input-sm"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-sm">Tipo comprobante</label>
            <select
              value={filtros.tipoComprobante}
              onChange={setE("tipoComprobante")}
              className="input-sm"
            >
              <option value="">Todos</option>
              <option value="factura">Factura</option>
              <option value="comprobante">Comprobante</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Nº comprobante</label>
            <input
              type="number"
              value={filtros.numeroComprobante}
              onChange={setE("numeroComprobante")}
              placeholder="00000001"
              className="input-sm"
            />
          </div>
          <div>
            <label className="label-sm">Forma de pago</label>
            <select
              value={filtros.formaPago}
              onChange={setE("formaPago")}
              className="input-sm"
            >
              <option value="">Todas</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cuenta_corriente">Cuenta corriente</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Condición de pago</label>
            <select
              value={filtros.condicionPago}
              onChange={setE("condicionPago")}
              className="input-sm"
            >
              <option value="">Todas</option>
              <option value="contado">Contado</option>
              <option value="15_dias">15 días</option>
              <option value="30_dias">30 días</option>
              <option value="60_dias">60 días</option>
              <option value="90_dias">90 días</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Estado remito</label>
            <select
              value={filtros.estadoRemito}
              onChange={setE("estadoRemito")}
              className="input-sm"
            >
              <option value="">Todos</option>
              <option value="sin_remito">Sin remito</option>
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Cobro pendiente</label>
            <select
              value={filtros.cobroPendiente}
              onChange={setE("cobroPendiente")}
              className="input-sm"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="label-sm">Provincia</label>
            <SearchSelect
              options={opProvincias}
              value={filtros.provincia}
              onChange={set("provincia")}
              placeholder="Buscar..."
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Tabla compacta */}
      <div className="card-compact p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-gray-400">
            Cargando...
          </div>
        ) : data?.ventas?.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No hay ventas con esos filtros
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-[10px] text-gray-500 uppercase">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Repr.</th>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium">Comprobante</th>
                  <th className="px-3 py-2 font-medium">Neto</th>
                  <th className="px-3 py-2 font-medium">IVA</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Comisión</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data?.ventas?.map((v) => {
                  const { importeNeto, totalIva } = calcularResumenImpositivo(
                    v.items,
                    v.descuentoGlobal,
                  );
                  return (
                    <tr
                      key={v._id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-3 py-1.5 text-gray-400 font-mono">
                        #{v.numero}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-gray-800">
                        {v.cliente?.nombre || v.cliente?.razonSocial}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {v.representacion?.fantasia || v.representacion?.nombre}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {v.vendedor?.nombre}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {v.comprobante?.tipo ? (
                          <span>
                            {v.comprobante.tipo === "factura" ? "FC" : "CB"}{" "}
                            {String(v.comprobante.numero || "").padStart(
                              8,
                              "0",
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {formatMoney(importeNeto)}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {formatMoney(totalIva)}
                      </td>
                      <td className="px-3 py-1.5 font-medium">
                        {formatMoney(v.total)}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {v.comision ? (
                          formatMoney(v.comision.montoComision)
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        {formatFecha(v.createdAt)}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`badge text-[10px] ${ESTADOS[v.estado]?.class}`}
                        >
                          {ESTADOS[v.estado]?.label}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {!["cobrado", "cancelado"].includes(v.estado) && (
                          <button
                            onClick={() => {
                              if (confirm("¿Cancelar esta venta?"))
                                cancelar(v._id);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
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
