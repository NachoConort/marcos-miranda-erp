import { useQuery } from "@tanstack/react-query";
import { productosService } from "@/services/productos.service";
import { X, FileSpreadsheet, AlertCircle } from "lucide-react";

const formatFechaHora = (d) =>
  new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function HistorialImportacionesModal({ onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["importaciones-excel"],
    queryFn: () => productosService.getImportaciones(),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">
              Historial de importaciones
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Cargando...
            </p>
          ) : data?.importaciones?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay importaciones registradas
            </p>
          ) : (
            <div className="space-y-3">
              {data?.importaciones?.map((imp) => (
                <div
                  key={imp._id}
                  className="border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {imp.usuario?.nombre}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFechaHora(imp.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                      {imp.nombreArchivo}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-2">
                    <span className="text-gray-500">
                      <span className="font-medium text-gray-700">
                        {imp.totalFilas}
                      </span>{" "}
                      filas
                    </span>
                    <span className="text-green-600">
                      <span className="font-medium">{imp.creados}</span> creados
                    </span>
                    <span className="text-blue-600">
                      <span className="font-medium">{imp.actualizados}</span>{" "}
                      actualizados
                    </span>
                    {imp.erroresCount > 0 && (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle size={13} />
                        <span className="font-medium">
                          {imp.erroresCount}
                        </span>{" "}
                        errores
                      </span>
                    )}
                  </div>

                  {imp.errores?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                        Ver detalle de errores
                      </summary>
                      <ul className="mt-2 space-y-0.5 pl-3">
                        {imp.errores.map((e, i) => (
                          <li key={i} className="text-xs text-gray-500">
                            • {e}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
