import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { presupuestosService } from "@/services/presupuestos.service";
import { useFormData } from "@/hooks/useFormData";
import SearchSelect from "@/components/shared/SearchSelect";
import ResumenImpositivo from "@/components/shared/ResumenImpositivo";
import useAuthStore from "@/store/auth.store";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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
      estado: "no_enviado",
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
      setValue(`items.${index}.precioUnitario`, producto.costo);
      setValue(`items.${index}.codigo`, producto.codigo || "");
      setValue(`items.${index}.unidad`, producto.unidadMedida || "");
      setValue(`items.${index}.productoLabel`, producto.nombre);
      setValue(`items.${index}.porcentajeIva`, producto.porcentajeIva ?? 21); // ← guardar IVA
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

    const itemsCalculados = data.items.map((item) => ({
      ...item,
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/presupuestos")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          Nuevo presupuesto
        </h2>
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
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                {...register("fechaComprobante")}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select {...register("tipoComprobante")} className="input">
                <option value="factura">Factura</option>
                <option value="comprobante">Comprobante</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select {...register("estado")} className="input">
                <option value="no_enviado">No enviado</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Validez (días)
              </label>
              <input
                type="number"
                {...register("validezDias")}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                Observaciones
              </label>
              <input
                {...register("observaciones")}
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
              const descMonto = subtotal - subtotalConDesc;

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
                        placeholder={
                          representacionId
                            ? "Descripción"
                            : "Seleccioná primero la representación"
                        }
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
                    {descMonto > 0 && (
                      <p className="text-xs text-red-400">
                        - {formatMoney(descMonto)}
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

            {/* Totales */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <div className="w-80">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-2">
                    <span>Descuento global</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      {...register("descuentoGlobal", { valueAsNumber: true })}
                      className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        </div>

        {/* Comisiones — visibilidad según rol */}
        {(esAdmin || true) && (
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Comisiones
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Comisión representación — solo admin */}
              {esAdmin && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3">
                    Comisión representación
                    <span className="ml-2 badge bg-purple-100 text-purple-700">
                      Solo admin
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Porcentaje
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          {...register("comisionRepresentacion.porcentaje")}
                          className="input"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Tipo
                      </label>
                      <select
                        {...register("comisionRepresentacion.tipo")}
                        className="input"
                      >
                        <option value="con_factura">Con factura</option>
                        <option value="en_negro">En negro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Monto</span>
                    <span className="font-semibold text-gray-800">
                      {formatMoney(montoComRep)}
                    </span>
                  </div>
                </div>
              )}

              {/* Comisión vendedor — el propio vendedor o admin */}
              <div
                className={`bg-gray-50 rounded-lg p-4 ${!esAdmin ? "col-span-2" : ""}`}
              >
                <p className="text-xs font-medium text-gray-600 mb-3">
                  Comisión vendedor
                  {!esAdmin && (
                    <span className="ml-2 badge bg-blue-100 text-blue-700">
                      Tu comisión
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Porcentaje
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        {...register("comisionVendedor.porcentaje")}
                        className="input"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Tipo
                    </label>
                    <select
                      {...register("comisionVendedor.tipo")}
                      className="input"
                    >
                      <option value="con_factura">Con factura</option>
                      <option value="en_negro">En negro</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-semibold text-gray-800">
                    {formatMoney(montoComVend)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/presupuestos")}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Guardando..." : "Crear presupuesto"}
          </button>
        </div>
      </form>
    </div>
  );
}
