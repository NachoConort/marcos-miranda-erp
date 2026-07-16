import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ventasService } from "@/services/ventas.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
import FilaItemProducto from "@/components/shared/FilaItemProducto";
import ResumenImpositivo from "@/components/shared/ResumenImpositivo";
import api from "@/services/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function NuevaVentaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pedidoOrigenId = searchParams.get("pedido");

  const [representacionId, setRepresentacionId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 });
  const [totalCobranza, setTotalCobranza] = useState(0);

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
      comprobante: {
        tipo: "factura",
        puntoVenta: "",
        numero: "",
        fechaEmision: "",
      },
      cobranzas: [],
      condicionPago: "",
      estadoRemito: "sin_remito",
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: "items" });
  const {
    fields: cobranzaFields,
    append: appendCobranza,
    remove: removeCobranza,
  } = useFieldArray({ control, name: "cobranzas" });

  const items = watch("items");
  const descuentoGlobal = watch("descuentoGlobal");
  const cobranzas = watch("cobranzas");

  const itemsSerializados = JSON.stringify(
    items.map((i) => ({ p: i.precioUnitario, c: i.cantidad, d: i.descuento })),
  );
  const cobranzasSerializadas = JSON.stringify(
    cobranzas.map((c) => ({ m: c.monto, co: c.cotizacion })),
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

  useEffect(() => {
    const total = cobranzas.reduce(
      (acc, c) => acc + (Number(c.monto) || 0) * (Number(c.cotizacion) || 1),
      0,
    );
    setTotalCobranza(total);
  }, [cobranzasSerializadas]);

  const { data: pedidoData } = useQuery({
    queryKey: ["pedido", pedidoOrigenId],
    queryFn: () => api.get(`/pedidos/${pedidoOrigenId}`).then((r) => r.data),
    enabled: !!pedidoOrigenId,
  });

  useEffect(() => {
    if (!pedidoData?.pedido) return;
    const pedido = pedidoData.pedido;
    setRepresentacionId(pedido.representacion?._id || pedido.representacion);
    setClienteId(pedido.cliente?._id || pedido.cliente);
    setVendedorId(pedido.vendedor?._id || pedido.vendedor);

    const itemsPedido = pedido.items.map((item) => ({
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

    setValue("items", itemsPedido);
    setValue("descuentoGlobal", pedido.descuentoGlobal || 0);
    if (pedido.notas) setValue("notas", pedido.notas);
  }, [pedidoData]);

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
    mutationFn: (data) => ventasService.crear(data),
    onSuccess: () => navigate("/ventas"),
    onError: (err) =>
      alert(err.response?.data?.message || "Error al crear la venta"),
  });

  const onSubmit = (data) => {
    if (!representacionId) return alert("Seleccioná una representación");
    if (!clienteId) return alert("Seleccioná un cliente");
    if (!vendedorId) return alert("Seleccioná un vendedor");

    const itemsCalculados = data.items.map((item) => ({
      ...item,
      subtotal:
        Number(item.precioUnitario) *
        Number(item.cantidad) *
        (1 - Math.min(Number(item.descuento) || 0, 100) / 100),
    }));
    const cobranzasCalculadas = (data.cobranzas || []).map((c) => ({
      ...c,
      cotizacion: Number(c.cotizacion) || 1,
      monto: Number(c.monto),
      total: Number(c.monto) * (Number(c.cotizacion) || 1),
    }));
    crear({
      ...data,
      vendedor: vendedorId,
      representacion: representacionId,
      cliente: clienteId,
      items: itemsCalculados,
      cobranzas: cobranzasCalculadas,
      pedidoOrigen: pedidoOrigenId || undefined,
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

  const saldoPendiente = totales.total - totalCobranza;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(pedidoOrigenId ? "/pedidos" : "/ventas")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nueva venta</h2>
          <p className="text-xs text-gray-500">
            {pedidoOrigenId
              ? `Confirmando pedido #${pedidoData?.pedido?.numero ?? "..."}`
              : "Registrá los datos del comprobante recibido"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Datos generales */}
        <div className="card-compact">
          <h3 className="text-xs font-medium text-gray-700 mb-2.5 uppercase tracking-wide">
            Datos generales
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="label-sm">Representación *</label>
              <SearchSelect
                options={opRepresentaciones}
                value={representacionId}
                onChange={setRepresentacionId}
                placeholder="Buscar..."
                loading={loading}
                disabled={!!pedidoOrigenId}
                size="sm"
              />
            </div>
            <div>
              <label className="label-sm">Cliente *</label>
              <SearchSelect
                options={opClientes}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar..."
                loading={loading}
                disabled={!!pedidoOrigenId}
                size="sm"
              />
            </div>
            <div>
              <label className="label-sm">Vendedor *</label>
              <SearchSelect
                options={opVendedores}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Buscar..."
                loading={loading}
                disabled={!!pedidoOrigenId}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Condición de pago (incluye comprobante) */}
        <div className="card-compact">
          <h3 className="text-xs font-medium text-gray-700 mb-2.5 uppercase tracking-wide">
            Condición de pago
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="label-sm">Tipo comprobante *</label>
              <select
                {...register("comprobante.tipo", { required: true })}
                className="input-sm"
              >
                <option value="factura">Factura</option>
                <option value="comprobante">Comprobante</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Punto de venta *</label>
              <input
                type="number"
                {...register("comprobante.puntoVenta", { required: true })}
                placeholder="0001"
                className="input-sm"
              />
            </div>
            <div>
              <label className="label-sm">Número *</label>
              <input
                type="number"
                {...register("comprobante.numero", { required: true })}
                placeholder="00000001"
                className="input-sm"
              />
            </div>
            <div>
              <label className="label-sm">Fecha emisión *</label>
              <input
                type="date"
                {...register("comprobante.fechaEmision", { required: true })}
                className="input-sm"
              />
            </div>
            <div>
              <label className="label-sm">Condición de pago</label>
              <select {...register("condicionPago")} className="input-sm">
                <option value="">Sin especificar</option>
                <option value="contado">Contado</option>
                <option value="15_dias">15 días</option>
                <option value="30_dias">30 días</option>
                <option value="60_dias">60 días</option>
                <option value="90_dias">90 días</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Cobrador</label>
              <input
                {...register("cobrador.nombre")}
                placeholder="Nombre"
                className="input-sm"
              />
            </div>
            <div>
              <label className="label-sm">Tel. cobrador</label>
              <input
                {...register("cobrador.telefono")}
                placeholder="381 000-0000"
                className="input-sm"
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

        {/* Cobranza */}
        <div className="card-compact">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Cobranza
            </h3>
            <button
              type="button"
              onClick={() =>
                appendCobranza({
                  caja: "",
                  fechaMovimiento: "",
                  tipoValor: "efectivo",
                  referencia: "",
                  moneda: "pesos",
                  cotizacion: 1,
                  monto: "",
                })
              }
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={12} /> Agregar pago
            </button>
          </div>

          {cobranzaFields.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              Sin pagos — la venta quedará pendiente de cobro
            </p>
          ) : (
            <div className="space-y-2">
              {cobranzaFields.map((field, index) => {
                const moneda = watch(`cobranzas.${index}.moneda`);
                const monto = Number(watch(`cobranzas.${index}.monto`)) || 0;
                const cotizacion =
                  Number(watch(`cobranzas.${index}.cotizacion`)) || 1;
                const totalPago = monto * cotizacion;

                return (
                  <div
                    key={field.id}
                    className="border border-gray-100 rounded-md p-2.5 bg-gray-50/50"
                  >
                    <div className="grid grid-cols-5 gap-2 mb-2">
                      <input
                        {...register(`cobranzas.${index}.caja`, {
                          required: true,
                        })}
                        placeholder="Caja"
                        className="input-sm"
                      />
                      <input
                        type="date"
                        {...register(`cobranzas.${index}.fechaMovimiento`, {
                          required: true,
                        })}
                        className="input-sm"
                      />
                      <select
                        {...register(`cobranzas.${index}.tipoValor`, {
                          required: true,
                        })}
                        className="input-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="cheque">Cheque</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="otros">Otros</option>
                      </select>
                      <input
                        {...register(`cobranzas.${index}.referencia`)}
                        placeholder="Referencia"
                        className="input-sm"
                      />
                      <select
                        {...register(`cobranzas.${index}.moneda`)}
                        className="input-sm"
                      >
                        <option value="pesos">Pesos ($)</option>
                        <option value="dolar">Dólar (USD)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      {moneda === "dolar" && (
                        <input
                          type="number"
                          {...register(`cobranzas.${index}.cotizacion`)}
                          placeholder="Cotización"
                          className="input-sm"
                        />
                      )}
                      <input
                        type="number"
                        {...register(`cobranzas.${index}.monto`, {
                          required: true,
                        })}
                        placeholder="Monto"
                        className="input-sm"
                      />
                      <div className="flex items-center justify-between col-span-2">
                        <p className="text-xs font-semibold text-gray-700">
                          {formatMoney(totalPago)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeCobranza(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end pt-1">
                <div className="w-60 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Total venta</span>
                    <span>{formatMoney(totales.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Cobrado</span>
                    <span className="text-green-600">
                      {formatMoney(totalCobranza)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between font-semibold border-t border-gray-100 pt-1 ${saldoPendiente > 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    <span>Saldo pendiente</span>
                    <span>{formatMoney(Math.max(saldoPendiente, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logística */}
        <div className="card-compact">
          <h3 className="text-xs font-medium text-gray-700 mb-2.5 uppercase tracking-wide">
            Logística
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label-sm">Estado remito</label>
              <select {...register("estadoRemito")} className="input-sm">
                <option value="sin_remito">Sin remito</option>
                <option value="pendiente">Pendiente</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Notas</label>
              <input
                {...register("notas")}
                className="input-sm"
                placeholder="Observaciones..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(pedidoOrigenId ? "/pedidos" : "/ventas")}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-sm"
          >
            {isPending ? "Guardando..." : "Confirmar venta"}
          </button>
        </div>
      </form>
    </div>
  );
}
