import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { productosService } from "@/services/productos.service";
import HistorialImportacionesModal from "./HistorialImportacionesModal";
import { History } from "lucide-react";
import {
  Plus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Package,
  Upload,
  Download,
} from "lucide-react";
import useAuthStore from "@/store/auth.store";

const IVA_LABELS = { 0: "0%", 10.5: "10.5%", 21: "21%", 27: "27%" };

const formatMoney = (n, moneda) => {
  const sym = moneda === "dolar" ? "USD " : "$";
  return `${sym}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n || 0)}`;
};

export default function ProductosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["productos", busquedaActiva],
    queryFn: () =>
      productosService.getAll({ busqueda: busquedaActiva || undefined }),
  });

  const { mutate: toggle } = useMutation({
    mutationFn: (id) => productosService.toggleHabilitado(id),
    onSuccess: () => queryClient.invalidateQueries(["productos"]),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => productosService.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries(["productos"]),
    onError: (err) => alert(err.response?.data?.message || "Error"),
  });

  const { mutate: importar, isPending: importando } = useMutation({
    mutationFn: (archivo) => productosService.importarExcel(archivo),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries(["productos"]);
    },
    onError: (err) => alert(err.response?.data?.message || "Error al importar"),
  });

  const handleFileChange = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImportResult(null);
    importar(archivo);
    e.target.value = "";
  };

  const descargarPlantilla = async () => {
    const blob = await productosService.descargarPlantilla();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Productos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total ?? 0} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={descargarPlantilla}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={15} /> Plantilla Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload size={15} />{" "}
            {importando ? "Importando..." : "Importar Excel"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => setMostrarHistorial(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <History size={15} /> Historial
          </button>
          <button
            onClick={() => navigate("/productos/nuevo")}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Resultado de importación */}
      {importResult && (
        <div
          className={`card border ${importResult.resultados.errores.length > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}`}
        >
          <p
            className={`text-sm font-medium ${importResult.resultados.errores.length > 0 ? "text-yellow-800" : "text-green-800"}`}
          >
            {importResult.message}
          </p>
          {importResult.resultados.errores.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {importResult.resultados.errores.map((e, i) => (
                <li key={i} className="text-xs text-yellow-700">
                  {e}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="text-xs text-gray-500 hover:underline mt-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Búsqueda */}
      <div className="card py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && setBusquedaActiva(busqueda)
              }
              placeholder="Buscar por nombre, código o código de barra..."
              className="input pl-8"
            />
          </div>
          <button
            onClick={() => setBusquedaActiva(busqueda)}
            className="btn-primary"
          >
            Buscar
          </button>
          {busquedaActiva && (
            <button
              onClick={() => {
                setBusqueda("");
                setBusquedaActiva("");
              }}
              className="btn-secondary"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Cargando...
          </div>
        ) : data?.productos?.length === 0 ? (
          <div className="p-10 text-center">
            <Package size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No se encontraron productos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Rubro</th>
                  <th className="px-4 py-3 font-medium">Representaciones</th>
                  <th className="px-4 py-3 font-medium">Costo</th>
                  <th className="px-4 py-3 font-medium">IVA</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.productos?.map((p) => (
                  <tr
                    key={p._id}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${!p.habilitado ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.codigo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.nombre}</p>
                      {p.codigoBarra && (
                        <p className="text-xs text-gray-400 font-mono">
                          {p.codigoBarra}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.marca?.nombre || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <p>{p.rubro || "—"}</p>
                      {p.subRubro && (
                        <p className="text-xs text-gray-400">{p.subRubro}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.representaciones?.length > 0 ? (
                          p.representaciones.slice(0, 2).map((r) => (
                            <span
                              key={r._id}
                              className="badge bg-blue-50 text-blue-700 text-xs"
                            >
                              {r.fantasia || r.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs">
                            Sin asignar
                          </span>
                        )}
                        {p.representaciones?.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{p.representaciones.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatMoney(p.costo, p.moneda)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {IVA_LABELS[p.porcentajeIva]}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.stockeable ? (
                        <div>
                          <span
                            className={
                              p.cantidadDisponible > 0
                                ? "text-green-600 font-medium"
                                : p.aceptaStockNegativo
                                  ? "text-orange-500"
                                  : "text-red-500"
                            }
                          >
                            {p.cantidadDisponible} {p.unidadMedida}
                          </span>
                          {p.aceptaStockNegativo && (
                            <p className="text-xs text-gray-400">
                              Acepta negativo
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">
                          No stockeable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${p.habilitado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {p.habilitado ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/productos/${p._id}/editar`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggle(p._id)}
                          className={`transition-colors ${p.habilitado ? "text-green-500 hover:text-gray-400" : "text-gray-400 hover:text-green-500"}`}
                        >
                          {p.habilitado ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>
                        {usuario.rol === "admin" && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar ${p.nombre}?`))
                                eliminar(p._id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {mostrarHistorial && (
        <HistorialImportacionesModal
          onClose={() => setMostrarHistorial(false)}
        />
      )}
    </div>
  );
}
