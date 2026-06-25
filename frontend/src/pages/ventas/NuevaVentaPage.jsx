import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ventasService } from "@/services/ventas.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
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
      comprobante: { tipo: "factura", numero: "", fechaEmision: "" },
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

  // Serializar items para detectar cambios
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

  useEffect(() => {
    const total = cobranzas.reduce(
      (acc, c) => acc + (Number(c.monto) || 0) * (Number(c.cotizacion) || 1),
      0,
    );
    setTotalCobranza(total);
  }, [
    JSON.stringify(cobranzas.map((c) => ({ m: c.monto, co: c.cotizacion }))),
  ]);

  // Cargar datos del pedido origen
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
      // Usar el productoId guardado al crear el pedido
      productoSeleccionadoId: item.productoId || "",
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
      // Buscar el IVA del producto en el catálogo
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
      setValue(`items.${index}.porcentajeIva`, producto.porcentajeIva ?? 21); // ← guardar IVA
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

  // Opciones para SearchSelect
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(pedidoOrigenId ? "/pedidos" : "/ventas")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nueva venta</h2>
          <p className="text-sm text-gray-500">
            {pedidoOrigenId
              ? `Confirmando pedido #${pedidoData?.pedido?.numero ?? "..."}`
              : "Registrá los datos del comprobante recibido"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Datos generales */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Datos generales
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Representación *
              </label>
              <SearchSelect
                options={opRepresentaciones}
                value={representacionId}
                onChange={setRepresentacionId}
                placeholder="Buscar representación..."
                loading={loading}
                disabled={!!pedidoOrigenId}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Cliente *
              </label>
              <SearchSelect
                options={opClientes}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar cliente..."
                loading={loading}
                disabled={!!pedidoOrigenId}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Vendedor *
              </label>
              <SearchSelect
                options={opVendedores}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Buscar vendedor..."
                loading={loading}
                disabled={!!pedidoOrigenId}
              />
            </div>
          </div>
        </div>

        {/* Condición de pago — incluye comprobante */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Condición de pago
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Comprobante */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Tipo comprobante *
              </label>
              <select
                {...register("comprobante.tipo", { required: true })}
                className="input"
              >
                <option value="factura">Factura</option>
                <option value="comprobante">Comprobante</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Punto de venta *
              </label>
              <input
                type="number"
                {...register("comprobante.puntoVenta", { required: true })}
                placeholder="0001"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Número *
              </label>
              <input
                type="number"
                {...register("comprobante.numero", { required: true })}
                placeholder="00000001"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Fecha emisión *
              </label>
              <input
                type="date"
                {...register("comprobante.fechaEmision", { required: true })}
                className="input"
              />
            </div>

            {/* Condición y cobrador */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Condición de pago
              </label>
              <select {...register("condicionPago")} className="input">
                <option value="">Sin especificar</option>
                <option value="contado">Contado</option>
                <option value="15_dias">15 días</option>
                <option value="30_dias">30 días</option>
                <option value="60_dias">60 días</option>
                <option value="90_dias">90 días</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Cobrador
              </label>
              <input
                {...register("cobrador.nombre")}
                placeholder="Nombre del cobrador"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Tel. cobrador
              </label>
              <input
                {...register("cobrador.telefono")}
                placeholder="381 000-0000"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Logística */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Logística</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Estado remito
              </label>
              <select {...register("estadoRemito")} className="input">
                <option value="sin_remito">Sin remito</option>
                <option value="pendiente">Pendiente</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notas</label>
              <textarea
                {...register("notas")}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Productos</h3>
              {representacionId && opcionesProductos.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {listaPrecios.length > 0
                    ? "Usando lista de precios"
                    : "Usando catálogo de productos"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                appendItem({
                  descripcion: "",
                  cantidad: "",
                  precioUnitario: "",
                  descuento: "",
                })
              }
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Agregar ítem
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
              <span className="col-span-4">Producto</span>
              <span className="col-span-2">Precio unit.</span>
              <span className="col-span-2">Cantidad</span>
              <span className="col-span-1">Desc %</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {itemFields.map((field, index) => {
              const precio = Number(items[index]?.precioUnitario) || 0;
              const cant = Number(items[index]?.cantidad) || 0;
              const desc = Math.min(Number(items[index]?.descuento) || 0, 100);
              const subtotal = precio * cant;
              const subtotalConDesc = subtotal * (1 - desc / 100);
              const descuentoMonto = subtotal - subtotalConDesc;

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-4">
                    {opProductos.length > 0 ? (
                      <SearchSelect
                        options={opProductos}
                        value={items[index]?.productoSeleccionadoId || ""}
                        onChange={(id) => autocompletarItem(index, id)}
                        placeholder="Buscar producto..."
                        disabled={!representacionId}
                      />
                    ) : (
                      <input
                        {...register(`items.${index}.descripcion`, {
                          required: true,
                        })}
                        placeholder="Descripción"
                        className="input"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      {...register(`items.${index}.precioUnitario`)}
                      placeholder="0.00"
                      className="input"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      {...register(`items.${index}.cantidad`)}
                      placeholder="0"
                      className="input"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      max="100"
                      {...register(`items.${index}.descuento`)}
                      placeholder="0"
                      className="input"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {formatMoney(subtotalConDesc)}
                    </p>
                    {descuentoMonto > 0 && (
                      <p className="text-xs text-red-400">
                        - {formatMoney(descuentoMonto)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {itemFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totales */}
          <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
            <div className="w-80">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-2">
                  <span>Descuento global</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    {...register("descuentoGlobal", { valueAsNumber: true })}
                    className="w-14 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span>%</span>
                </div>
              </div>
              <ResumenImpositivo
                items={items}
                descuentoGlobal={descuentoGlobal}
              />
            </div>
          </div>
        </div>

        {/* Cobranza */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Cobranza</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Podés agregar múltiples pagos
              </p>
            </div>
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
              <Plus size={13} /> Agregar pago
            </button>
          </div>

          {cobranzaFields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin pagos — la venta quedará pendiente de cobro
            </p>
          ) : (
            <div className="space-y-3">
              {cobranzaFields.map((field, index) => {
                const moneda = watch(`cobranzas.${index}.moneda`);
                const monto = Number(watch(`cobranzas.${index}.monto`)) || 0;
                const cotizacion =
                  Number(watch(`cobranzas.${index}.cotizacion`)) || 1;
                const totalPago = monto * cotizacion;

                return (
                  <div
                    key={field.id}
                    className="border border-gray-100 rounded-lg p-3 bg-gray-50/50"
                  >
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Caja *
                        </label>
                        <input
                          {...register(`cobranzas.${index}.caja`, {
                            required: true,
                          })}
                          placeholder="Ej: Caja principal"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Fecha *
                        </label>
                        <input
                          type="date"
                          {...register(`cobranzas.${index}.fechaMovimiento`, {
                            required: true,
                          })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Tipo de valor *
                        </label>
                        <select
                          {...register(`cobranzas.${index}.tipoValor`, {
                            required: true,
                          })}
                          className="input"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="cheque">Cheque</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="otros">Otros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Referencia
                        </label>
                        <input
                          {...register(`cobranzas.${index}.referencia`)}
                          placeholder="Nº cheque, transf..."
                          className="input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Moneda *
                        </label>
                        <select
                          {...register(`cobranzas.${index}.moneda`)}
                          className="input"
                        >
                          <option value="pesos">Pesos ($)</option>
                          <option value="dolar">Dólar (USD)</option>
                        </select>
                      </div>
                      {moneda === "dolar" && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Cotización
                          </label>
                          <input
                            type="number"
                            {...register(`cobranzas.${index}.cotizacion`)}
                            className="input"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Monto *
                        </label>
                        <input
                          type="number"
                          {...register(`cobranzas.${index}.monto`, {
                            required: true,
                          })}
                          placeholder="0"
                          className="input"
                        />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Total en $</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatMoney(totalPago)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCobranza(index)}
                          className="text-red-400 hover:text-red-600 mb-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Resumen */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Total venta</span>
                    <span>{formatMoney(totales.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Total cobrado</span>
                    <span className="text-green-600">
                      {formatMoney(totalCobranza)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between font-semibold border-t border-gray-100 pt-1.5 ${saldoPendiente > 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    <span>Saldo pendiente</span>
                    <span>{formatMoney(Math.max(saldoPendiente, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(pedidoOrigenId ? "/pedidos" : "/ventas")}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Guardando..." : "Confirmar venta"}
          </button>
        </div>
      </form>
    </div>
  );
}
