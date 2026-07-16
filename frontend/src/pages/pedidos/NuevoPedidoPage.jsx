import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pedidosService } from "@/services/pedidos.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
import FilaItemProducto from "@/components/shared/FilaItemProducto";
import ResumenImpositivo from "@/components/shared/ResumenImpositivo";
import api from "@/services/api";
import { ArrowLeft, Plus } from "lucide-react";

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function NuevoPedidoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presupuestoOrigenId = searchParams.get("presupuesto");

  const [representacionId, setRepresentacionId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [totales, setTotales] = useState({
    subtotalBruto: 0,
    totalDescuentos: 0,
    subtotalNeto: 0,
    total: 0,
  });

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
      tipoFacturacion: "facturado",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const descuentoGlobal = watch("descuentoGlobal");
  const tipoFacturacion = watch("tipoFacturacion");

  const itemsSerializados = JSON.stringify(
    items.map((i) => ({ p: i.precioUnitario, c: i.cantidad, d: i.descuento })),
  );

  useEffect(() => {
    const subtotalBruto = items.reduce(
      (acc, item) =>
        acc + (Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0),
      0,
    );

    const subtotalTrasItems = items.reduce((acc, item) => {
      const sub =
        (Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0);
      const desc = Math.min(Number(item.descuento) || 0, 100);
      return acc + sub * (1 - desc / 100);
    }, 0);

    const descGlobal = Math.min(Number(descuentoGlobal) || 0, 100);
    const total = subtotalTrasItems * (1 - descGlobal / 100);
    const totalDescuentos = subtotalBruto - total;

    setTotales({ subtotalBruto, totalDescuentos, subtotalNeto: total, total });
  }, [itemsSerializados, descuentoGlobal]);

  // Cargar presupuesto origen si viene de uno
  const { data: presupuestoData } = useQuery({
    queryKey: ["presupuesto-origen", presupuestoOrigenId],
    queryFn: () =>
      api.get(`/presupuestos/${presupuestoOrigenId}`).then((r) => r.data),
    enabled: !!presupuestoOrigenId,
  });

  useEffect(() => {
    if (!presupuestoData?.presupuesto) return;
    const p = presupuestoData.presupuesto;

    setRepresentacionId(p.representacion?._id || p.representacion);
    setClienteId(p.cliente?._id || p.cliente);
    setVendedorId(p.vendedor?._id || p.vendedor);

    const itemsPresupuesto = p.items.map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento || "",
      codigo: item.codigo || "",
      unidad: item.unidad || "",
      productoSeleccionadoId: item.productoId || "",
      productoLabel: item.descripcion,
      productoId: item.productoId || "",
      porcentajeIva: item.porcentajeIva ?? 21,
    }));

    setValue("items", itemsPresupuesto);
    setValue("descuentoGlobal", p.descuentoGlobal || 0);
    if (p.observaciones) setValue("notas", p.observaciones);
  }, [presupuestoData]);

  const autocompletarItem = (index, productoId) => {
    setValue(`items.${index}.productoSeleccionadoId`, productoId);
    setValue(`items.${index}.productoId`, productoId);

    const itemLista = listaPrecios.find((i) => i._id === productoId);
    if (itemLista) {
      setValue(`items.${index}.descripcion`, itemLista.descripcion);
      setValue(`items.${index}.precioUnitario`, itemLista.precio);
      setValue(`items.${index}.codigo`, itemLista.codigo || "");
      setValue(`items.${index}.unidad`, itemLista.unidad || "");
      setValue(`items.${index}.productoLabel`, itemLista.descripcion);
      const prod = productos.find(
        (p) => p._id === productoId || p.codigo === itemLista.codigo,
      );
      setValue(`items.${index}.porcentajeIva`, prod?.porcentajeIva ?? 21);
      return;
    }
    const producto = productos.find((p) => p._id === productoId);
    if (producto) {
      setValue(`items.${index}.descripcion`, producto.nombre);
      setValue(`items.${index}.precioUnitario`, producto.precioFinal);
      setValue(`items.${index}.codigo`, producto.codigo || "");
      setValue(`items.${index}.unidad`, producto.unidadMedida || "");
      setValue(`items.${index}.productoLabel`, producto.nombre);
      setValue(`items.${index}.porcentajeIva`, producto.porcentajeIva ?? 21);
    }
  };

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => pedidosService.crear(data),
    onSuccess: () => navigate("/pedidos"),
    onError: (err) =>
      alert(err.response?.data?.message || "Error al crear el pedido"),
  });

  const onSubmit = (data) => {
    if (!representacionId) return alert("Seleccioná una representación");
    if (!clienteId) return alert("Seleccioná un cliente");
    if (!vendedorId) return alert("Seleccioná un vendedor");

    const itemsCalculados = data.items.map((item) => ({
      ...item,
      descuento: Math.min(Number(item.descuento) || 0, 100),
      subtotal: Number(item.precioUnitario) * Number(item.cantidad),
      subtotalConDescuento:
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
      descuentoGlobal: Math.min(Number(data.descuentoGlobal) || 0, 100),
      presupuestoOrigen: presupuestoOrigenId || undefined,
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

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/pedidos")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nuevo pedido</h2>
          <p className="text-xs text-gray-500">
            Se enviará a la representación para su confirmación
          </p>
        </div>
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
            <div className="col-span-2">
              <label className="label-sm">Tipo de facturación</label>
              <select {...register("tipoFacturacion")} className="input-sm">
                <option value="facturado">Facturado (con IVA)</option>
                <option value="comprobante">Comprobante (sin IVA)</option>
              </select>
            </div>
            <div className="col-span-4">
              <label className="label-sm">Notas</label>
              <input
                {...register("notas")}
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/pedidos")}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-sm"
          >
            {isPending ? "Guardando..." : "Crear pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
