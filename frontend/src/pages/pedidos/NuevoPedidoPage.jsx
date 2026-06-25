import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { pedidosService } from "@/services/pedidos.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
import ResumenImpositivo from "@/components/shared/ResumenImpositivo";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/services/api";

const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function NuevoPedidoPage() {
  const navigate = useNavigate();
  const [representacionId, setRepresentacionId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [totales, setTotales] = useState({
    subtotalBruto: 0,
    totalDescuentos: 0,
    subtotalNeto: 0,
    totalIva: 0,
    total: 0,
  });

  const [searchParams] = useSearchParams();
  const presupuestoOrigenId = searchParams.get("presupuesto");

  const { data: presupuestoData } = useQuery({
    queryKey: ["presupuesto-origen", presupuestoOrigenId],
    queryFn: () =>
      api.get(`/presupuestos/${presupuestoOrigenId}`).then((r) => r.data),
    enabled: !!presupuestoOrigenId,
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

  // Recalcular totales cada vez que cambia cualquier valor
  const itemsSerializados = JSON.stringify(
    items.map((i) => ({
      p: i.precioUnitario,
      c: i.cantidad,
      d: i.descuento,
    })),
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
    const subtotalNeto = subtotalTrasItems * (1 - descGlobal / 100);
    const totalDescuentos = subtotalBruto - subtotalNeto;
    const totalIva = 0;
    const total = subtotalNeto + totalIva;

    setTotales({
      subtotalBruto,
      totalDescuentos,
      subtotalNeto,
      totalIva,
      total,
    });
  }, [itemsSerializados, descuentoGlobal, tipoFacturacion]);

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
      productoLabel: item.descripcion, // ← clave para que SearchSelect lo muestre
      productoId: item.productoId || "",
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/pedidos")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nuevo pedido</h2>
          <p className="text-sm text-gray-500">
            Se enviará a la representación para su confirmación
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Datos generales */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Datos generales
          </h3>
          <div className="grid grid-cols-2 gap-4">
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
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Tipo de facturación
              </label>
              <select {...register("tipoFacturacion")} className="input">
                <option value="facturado">Facturado </option>
                <option value="comprobante">Comprobante </option>
              </select>
            </div>
            <div
              className={tipoFacturacion !== "facturado" ? "col-span-2" : ""}
            >
              <label className="block text-xs text-gray-500 mb-1">Notas</label>
              <input
                {...register("notas")}
                className="input"
                placeholder="Observaciones..."
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
                append({
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
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
              <span className="col-span-4">Producto</span>
              <span className="col-span-2">Precio unit.</span>
              <span className="col-span-2">Cantidad</span>
              <span className="col-span-1">Desc %</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => {
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
                        valueLabel={
                          items[index]?.productoLabel ||
                          items[index]?.descripcion ||
                          ""
                        }
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
                      className="input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      {...register(`items.${index}.cantidad`)}
                      placeholder="0"
                      className="input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      max="100"
                      {...register(`items.${index}.descuento`)}
                      placeholder="0"
                      className="input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
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
              {/* Descuento global arriba del resumen */}
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/pedidos")}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Guardando..." : "Crear pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
