import { Trash2 } from "lucide-react";
import SearchSelect from "./SearchSelect";

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n || 0);

export default function FilaItemProducto({
  item,
  opciones,
  onSeleccionarProducto,
  register,
  index,
  disabled,
  onRemove,
  mostrarRemove,
}) {
  const precioConIva = Number(item?.precioUnitario) || 0;
  const cant = Number(item?.cantidad) || 0;
  const desc = Math.min(Number(item?.descuento) || 0, 100);
  const ivaPct = Number(item?.porcentajeIva ?? 21);

  const precioNetoUnitario =
    ivaPct > 0 ? precioConIva / (1 + ivaPct / 100) : precioConIva;
  const ivaUnitario = precioConIva - precioNetoUnitario;

  const subtotalConIva = precioConIva * cant;
  const subtotalConDesc = subtotalConIva * (1 - desc / 100);
  const descuentoMonto = subtotalConIva - subtotalConDesc;

  return (
    <div className="border-b border-gray-50 last:border-0 py-1.5">
      {/* Fila principal: producto, cantidad, precio, descuento */}
      <div className="grid grid-cols-12 gap-1.5 items-start mb-1">
        <div className="col-span-5">
          <SearchSelect
            options={opciones}
            value={item?.productoSeleccionadoId || ""}
            onChange={(id) => onSeleccionarProducto(index, id)}
            placeholder="Buscar producto..."
            disabled={disabled}
            valueLabel={item?.productoLabel || item?.descripcion || ""}
            size="sm"
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            {...register(`items.${index}.cantidad`)}
            placeholder="Cant."
            className="input-sm"
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            {...register(`items.${index}.precioUnitario`)}
            placeholder="P. unit."
            className="input-sm"
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            max="100"
            {...register(`items.${index}.descuento`)}
            placeholder="Desc %"
            className="input-sm"
          />
        </div>
        <div className="col-span-1 flex justify-center pt-1">
          {mostrarRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Fila secundaria: desglose neto/IVA/subtotal — separada para no amontonarse */}
      <div className="flex items-center justify-end gap-4 pr-8 text-[11px] text-gray-400">
        <span>
          Neto u.{" "}
          <span className="text-gray-600 font-medium">
            {formatMoney(precioNetoUnitario)}
          </span>
        </span>
        <span>
          IVA {ivaPct}%{" "}
          <span className="text-gray-600 font-medium">
            {formatMoney(ivaUnitario)}
          </span>
        </span>
        {descuentoMonto > 0 && (
          <span className="text-red-400">
            Desc. -{formatMoney(descuentoMonto)}
          </span>
        )}
        <span className="text-gray-700 font-semibold text-xs">
          {formatMoney(subtotalConDesc)}
        </span>
      </div>
    </div>
  );
}
