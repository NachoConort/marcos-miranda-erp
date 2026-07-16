import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { presupuestosService } from "@/services/presupuestos.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
import FilaItemProducto from "@/components/shared/FilaItemProducto";
import ResumenImpositivo from "@/components/shared/ResumenImpositivo";
import useAuthStore from "@/store/auth.store";
import { ArrowLeft, Plus } from "lucide-react";

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

const calcularMonto = (total, porcentaje, tipo) => {
  if (!total || !porcentaje) return 0;
  if (tipo === "con_factura")
    return Math.round((total / 1.21) * (porcentaje / 100) * 100) / 100;
  return Math.round(total * (porcentaje / 100) * 100) / 100;
};

const hoy = () => new Date().toISOString().slice(0, 10);

export default function NuevoPresupuestoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === "admin";

  const [representacionId, setRepresentacionId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 });

  const {
    representaciones,
    clientes,
    vendedores,
    listaPrecios,
    productos,
    loading,
  } = useFormData(representacionId);
  const opcionesProductos = listaPrecios.length > 0 ? listaPrecios : productos;

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      items: [
        { descripcion: "", cantidad: "", precioUnitario: "", descuento: "" },
      ],
      descuentoGlobal: 0,
      comisionRepresentacion: { porcentaje: 0, tipo: "con_factura" },
      comisionVendedor: { porcentaje: 0, tipo: "con_factura" },
      validezDias: 30,
      fechaComprobante: hoy(),
      tipoComprobante: "factura",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const descuentoGlobal = watch("descuentoGlobal");
  const comRepPct = watch("comisionRepresentacion.porcentaje");
  const comRepTipo = watch("comisionRepresentacion.tipo");
  const comVendPct = watch("comisionVendedor.porcentaje");
  const comVendTipo = watch("comisionVendedor.tipo");

  const itemsSerializados = JSON.stringify(
    items.map((i) => ({ p: i.precioUnitario, c: i.cantidad, d: i.descuento })),
  );

  useEffect(() => {
    const subtotal = items.reduce(
      (acc, item) =>
        acc +
        (Number(item.precioUnitario) || 0) *
          (Number(item.cantidad) || 0) *
          (1 - Math.min(Number(item.descuento) || 0, 100) / 100),
      0,
    );
    const total =
      subtotal * (1 - Math.min(Number(descuentoGlobal) || 0, 100) / 100);
    setTotales({ subtotal, total });
  }, [itemsSerializados, descuentoGlobal]);

  // Precargar comisiones cuando cambia la representación
  useEffect(() => {
    if (!representacionId) return;
    presupuestosService.getComisionesDefault(representacionId).then((data) => {
      if (data.comisionVendedor) {
        setValue(
          "comisionVendedor.porcentaje",
          data.comisionVendedor.porcentaje,
        );
        setValue("comisionVendedor.tipo", data.comisionVendedor.tipo);
      }
      if (data.comisionRepresentacion) {
        setValue(
          "comisionRepresentacion.porcentaje",
          data.comisionRepresentacion.porcentaje,
        );
        setValue(
          "comisionRepresentacion.tipo",
          data.comisionRepresentacion.tipo,
        );
      }
    });
  }, [representacionId]);

  const tipoComprobante = watch("tipoComprobante");

  useEffect(() => {
    const tipo = tipoComprobante === "factura" ? "con_factura" : "en_negro";
    setValue("comisionRepresentacion.tipo", tipo);
    setValue("comisionVendedor.tipo", tipo);
  }, [tipoComprobante]);

  const autocompletarItem = (index, productoId) => {
    setValue(`items.${index}.productoSeleccionadoId`, productoId);
    setValue(`items.${index}.productoId`, productoId);

    // Primero buscar en lista de precios
    const itemLista = listaPrecios.find((i) => i._id === productoId);
    if (itemLista) {
      setValue(`items.${index}.descripcion`, itemLista.descripcion);
      setValue(`items.${index}.precioUnitario`, Number(itemLista.precio) || 0);
      setValue(`items.${index}.codigo`, itemLista.codigo || "");
      setValue(`items.${index}.unidad`, itemLista.unidad || "");
      setValue(`items.${index}.productoLabel`, itemLista.descripcion);
      // Buscar el IVA en el catálogo por código
      const prod = productos.find(
        (p) => p.codigo === itemLista.codigo || p._id === productoId,
      );
      setValue(`items.${index}.porcentajeIva`, prod?.porcentajeIva ?? 21);
      return;
    }

    // Si no hay lista de precios, buscar en catálogo
    const producto = productos.find((p) => p._id === productoId);
    if (producto) {
      setValue(`items.${index}.descripcion`, producto.nombre);
      setValue(
        `items.${index}.precioUnitario`,
        Number(producto.precioFinal) || Number(producto.costo) || 0,
      );
      setValue(`items.${index}.codigo`, producto.codigo || "");
      setValue(`items.${index}.unidad`, producto.unidadMedida || "");
      setValue(`items.${index}.productoLabel`, producto.nombre);
      setValue(`items.${index}.porcentajeIva`, producto.porcentajeIva ?? 21);
    }
  };

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => presupuestosService.crear(data),
    onSuccess: () => navigate("/presupuestos"),
    onError: (err) =>
      alert(err.response?.data?.message || "Error al crear el presupuesto"),
  });

  const onSubmit = (data) => {
    if (!representacionId) return alert("Seleccioná una representación");
    if (!clienteId) return alert("Seleccioná un cliente");
    if (!vendedorId) return alert("Seleccioná un vendedor");

    // Validar comisiones
    const pctRep = Number(data.comisionRepresentacion?.porcentaje) || 0;
    const pctVend = Number(data.comisionVendedor?.porcentaje) || 0;

    if (pctRep > 100)
      return alert("La comisión de la representación no puede superar el 100%");
    if (pctVend > 100)
      return alert("La comisión del vendedor no puede superar el 100%");
    if (pctRep < pctVend)
      return alert(
        `La comisión de la representación (${pctRep}%) no puede ser menor que la del vendedor (${pctVend}%)`,
      );

    const itemsCalculados = data.items.map((item) => ({
      ...item,
      descuento: Math.min(Number(item.descuento) || 0, 100),
      subtotal:
        Number(item.precioUnitario) *
        Number(item.cantidad) *
        (1 - Math.min(Number(item.descuento) || 0, 100) / 100),
    }));

    crear({
      ...data,
      representacion: representacionId,
      cliente: clienteId,
      vendedor: vendedorId,
      items: itemsCalculados,
      estado: "no_enviado",
    });
  };

  const opRepresentaciones = representaciones.map((r) => ({
    value: r._id,
    label: r.fantasia || r.nombre,
    sublabel: r.razonSocial,
  }));
  const opClientes = clientes.map((c) => ({
    value: c._id,
    label: c.fantasia || c.razonSocial,
    sublabel: c.cuit,
  }));
  const opVendedores = vendedores.map((v) => ({
    value: v._id,
    label: v.nombre,
    sublabel: v.email,
  }));
  const opProductos = opcionesProductos.map((p) => ({
    value: p._id,
    label: p.descripcion || p.nombre,
    sublabel: p.codigo ? `Cód: ${p.codigo}` : undefined,
  }));

  const montoComRep = calcularMonto(
    totales.total,
    Number(comRepPct),
    comRepTipo,
  );
  const montoComVend = calcularMonto(
    totales.total,
    Number(comVendPct),
    comVendTipo,
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/presupuestos")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          Nuevo presupuesto
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Datos generales */}
        <div className="card-compact">
          <h3 className="text-xs font-medium text-gray-700 mb-2.5 uppercase tracking-wide">
            Datos generales
          </h3>
          <div className="grid grid-cols-6 gap-2.5">
            <div className="col-span-2">
              <label className="label-sm">Representación *</label>
              <SearchSelect
                options={opRepresentaciones}
                value={representacionId}
                onChange={setRepresentacionId}
                placeholder="Buscar..."
                loading={loading}
                size="sm"
              />
            </div>
            <div className="col-span-2">
              <label className="label-sm">Cliente *</label>
              <SearchSelect
                options={opClientes}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar..."
                loading={loading}
                size="sm"
              />
            </div>
            <div className="col-span-2">
              <label className="label-sm">Vendedor *</label>
              <SearchSelect
                options={opVendedores}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Buscar..."
                loading={loading}
                size="sm"
              />
            </div>
            <div>
              <label className="label-sm">Fecha</label>
              <input
                type="date"
                {...register("fechaComprobante")}
                className="input-sm"
              />
            </div>
            <div>
              <label className="label-sm">Tipo</label>
              <select {...register("tipoComprobante")} className="input-sm">
                <option value="factura">Factura</option>
                <option value="comprobante">Comprobante</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Validez (días)</label>
              <input
                type="number"
                {...register("validezDias")}
                className="input-sm"
              />
            </div>
            <div className="col-span-3">
              <label className="label-sm">Observaciones</label>
              <input
                {...register("observaciones")}
                className="input-sm"
                placeholder="Observaciones..."
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card-compact">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Productos{" "}
              {representacionId && opcionesProductos.length > 0 && (
                <span className="text-gray-400 font-normal">
                  · {listaPrecios.length > 0 ? "lista de precios" : "catálogo"}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() =>
                append({
                  descripcion: "",
                  cantidad: "",
                  precioUnitario: "",
                  descuento: "",
                })
              }
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={12} /> Agregar
            </button>
          </div>

          <div className="flex gap-4 items-start">
            {/* Columna izquierda: productos — crece con el contenido */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-12 gap-1.5 text-[10px] text-gray-400 px-0.5 mb-1 uppercase">
                <span className="col-span-5">Producto</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">P. unit (c/IVA)</span>
                <span className="col-span-2">Desc%</span>
                <span className="col-span-1" />
              </div>
              {fields.map((field, index) => (
                <FilaItemProducto
                  key={field.id}
                  item={items[index]}
                  index={index}
                  opciones={opProductos}
                  onSeleccionarProducto={autocompletarItem}
                  register={register}
                  disabled={!representacionId}
                  onRemove={() => remove(index)}
                  mostrarRemove={fields.length > 1}
                />
              ))}
            </div>

            {/* Columna derecha: totales — ancho fijo, sticky respecto al scroll de la página */}
            <div className="w-64 flex-shrink-0">
              <div className="sticky top-4">
                <div className="flex items-center justify-between gap-1.5 text-xs text-gray-500 mb-2">
                  <span>Desc. global</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      {...register("descuentoGlobal", { valueAsNumber: true })}
                      className="w-12 border border-gray-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span>%</span>
                  </div>
                </div>
                <ResumenImpositivo
                  items={items}
                  descuentoGlobal={descuentoGlobal}
                  compact
                />
              </div>
            </div>
          </div>
        </div>

        {/* Comisiones */}
        <div className="card-compact">
          <h3 className="text-xs font-medium text-gray-700 mb-2.5 uppercase tracking-wide">
            Comisiones
            <span className="ml-2 text-gray-400 font-normal normal-case">
              ({tipoComprobante === "factura" ? "con factura" : "en negro"})
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {esAdmin && (
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Comisión representación
                  <span className="ml-1 badge bg-purple-100 text-purple-700 text-[10px]">
                    admin
                  </span>
                </p>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register("comisionRepresentacion.porcentaje")}
                  className="input-sm w-full"
                  placeholder="%"
                />
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5 mt-2">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-semibold text-gray-800">
                    {formatMoney(montoComRep)}
                  </span>
                </div>
              </div>
            )}
            <div
              className={`bg-gray-50 rounded-md p-3 ${!esAdmin ? "col-span-2" : ""}`}
            >
              <p className="text-xs font-medium text-gray-600 mb-2">
                Comisión vendedor
                {!esAdmin && (
                  <span className="ml-1 badge bg-blue-100 text-blue-700 text-[10px]">
                    tu comisión
                  </span>
                )}
              </p>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("comisionVendedor.porcentaje")}
                className="input-sm w-full"
                placeholder="%"
              />
              <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5 mt-2">
                <span className="text-gray-500">Monto</span>
                <span className="font-semibold text-gray-800">
                  {formatMoney(montoComVend)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/presupuestos")}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-sm"
          >
            {isPending ? "Guardando..." : "Crear presupuesto"}
          </button>
        </div>
      </form>
    </div>
  );
}
