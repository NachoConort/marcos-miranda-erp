import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ventasService } from "@/services/ventas.service";
import api from "@/services/api";
import useAuthStore from "@/store/auth.store";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useFormData } from "@/hooks/useFormData";

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
  const { usuario } = useAuthStore();

  const [representacionSeleccionada, setRepresentacionSeleccionada] =
    useState("");
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 });
  const [totalCobranza, setTotalCobranza] = useState(0);

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      items: [
        { descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0 },
      ],
      descuentoGlobal: 0,
      comprobante: {
        tipo: "factura",
        letra: "A",
        puntoVenta: "",
        numero: "",
        fechaEmision: "",
        validacionAfip: "pendiente",
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

  // Calcular totales de items
  useEffect(() => {
    const subtotal = items.reduce(
      (acc, item) =>
        acc +
        (Number(item.precioUnitario) || 0) *
          (Number(item.cantidad) || 0) *
          (1 - (Number(item.descuento) || 0) / 100),
      0,
    );
    const total = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100);
    setTotales({ subtotal, total });
  }, [items, descuentoGlobal]);

  // Calcular total cobranzas
  useEffect(() => {
    const total = cobranzas.reduce(
      (acc, c) => acc + (Number(c.monto) || 0) * (Number(c.cotizacion) || 1),
      0,
    );
    setTotalCobranza(total);
  }, [cobranzas]);

  // Si viene de un pedido, precargarlo
  const { data: pedidoData } = useQuery({
    queryKey: ["pedido", pedidoOrigenId],
    queryFn: () => api.get(`/pedidos/${pedidoOrigenId}`).then((r) => r.data),
    enabled: !!pedidoOrigenId,
    onSuccess: (data) => {
      const pedido = data.pedido;
      setRepresentacionSeleccionada(pedido.representacion._id);
      setValue("cliente", pedido.cliente._id);
      pedido.items.forEach((item, i) => {
        if (i === 0) setValue(`items.0`, item);
        else appendItem(item);
      });
      setValue("descuentoGlobal", pedido.descuentoGlobal);
    },
  });

  const { representaciones, clientes, listaPrecios, productos, loading } =
    useFormData(representacionSeleccionada);
  const opcionesProductos = listaPrecios.length > 0 ? listaPrecios : productos;

  const autocompletarItem = (index, itemId) => {
    const item = listaPrecios.find((i) => i._id === itemId);
    if (!item) return;
    setValue(`items.${index}.descripcion`, item.descripcion);
    setValue(`items.${index}.precioUnitario`, item.precio);
    setValue(`items.${index}.codigo`, item.codigo || "");
    setValue(`items.${index}.unidad`, item.unidad || "");
    setValue(`items.${index}.listaPrecios`, item.descripcion);
  };

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => ventasService.crear(data),
    onSuccess: () => navigate("/ventas"),
    onError: (err) =>
      alert(err.response?.data?.message || "Error al crear la venta"),
  });

  const onSubmit = (data) => {
    const itemsCalculados = data.items.map((item) => ({
      ...item,
      subtotal:
        Number(item.precioUnitario) *
        Number(item.cantidad) *
        (1 - (Number(item.descuento) || 0) / 100),
    }));
    const cobranzasCalculadas = (data.cobranzas || []).map((c) => ({
      ...c,
      cotizacion: Number(c.cotizacion) || 1,
      monto: Number(c.monto),
      total: Number(c.monto) * (Number(c.cotizacion) || 1),
    }));
    crear({
      ...data,
      representacion: representacionSeleccionada,
      items: itemsCalculados,
      cobranzas: cobranzasCalculadas,
      pedidoOrigen: pedidoOrigenId || undefined,
    });
  };

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Representación *
              </label>
              <select
                value={representacionSeleccionada}
                onChange={(e) => setRepresentacionSeleccionada(e.target.value)}
                className="input"
                required
                disabled={!!pedidoOrigenId}
              >
                <option value="">
                  {loading ? "Cargando..." : "Seleccionar representación"}
                </option>
                {representaciones.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fantasia || r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Cliente *
              </label>
              <select
                {...register("cliente", { required: true })}
                className="input"
                disabled={!!pedidoOrigenId}
              >
                <option value="">
                  {loading ? "Cargando..." : "Seleccionar cliente"}
                </option>
                {clientes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fantasia || c.razonSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comprobante */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Comprobante
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
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
                Letra *
              </label>
              <select
                {...register("comprobante.letra", { required: true })}
                className="input"
              >
                {["A", "B", "C", "X"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Punto de venta *
              </label>
              <input
                type="number"
                min="1"
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
                min="1"
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Validación AFIP
              </label>
              <select
                {...register("comprobante.validacionAfip")}
                className="input"
              >
                <option value="pendiente">Pendiente</option>
                <option value="validada">Validada</option>
                <option value="no_validada">No validada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                CAE (si aplica)
              </label>
              <input
                {...register("comprobante.cae")}
                placeholder="Código CAE"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Productos</h3>
            <button
              type="button"
              onClick={() =>
                appendItem({
                  descripcion: "",
                  cantidad: 1,
                  precioUnitario: 0,
                  descuento: 0,
                })
              }
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Agregar ítem
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
              <span className="col-span-1">Código</span>
              <span className="col-span-3">Descripción</span>
              <span className="col-span-2">Lista precio</span>
              <span className="col-span-1">Cant.</span>
              <span className="col-span-1">P. Unit.</span>
              <span className="col-span-1">Desc %</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {itemFields.map((field, index) => {
              const precio = Number(items[index]?.precioUnitario) || 0;
              const cant = Number(items[index]?.cantidad) || 0;
              const desc = Number(items[index]?.descuento) || 0;
              const subtotal = precio * cant * (1 - desc / 100);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1">
                    <input
                      {...register(`items.${index}.codigo`)}
                      placeholder="COD"
                      className="input text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    {opcionesProductos.length > 0 ? (
                      <select
                        onChange={(e) =>
                          autocompletarItem(index, e.target.value)
                        }
                        className="input"
                        disabled={!representacionSeleccionada}
                      >
                        <option value="">Seleccionar producto</option>
                        {opcionesProductos.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.descripcion || p.nombre}{" "}
                            {p.codigo ? `(${p.codigo})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...register(`items.${index}.descripcion`, {
                          required: true,
                        })}
                        placeholder={
                          representacionSeleccionada
                            ? "Descripción"
                            : "Seleccioná primero la representación"
                        }
                        className="input"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.listaPrecios`)}
                      placeholder="Lista"
                      className="input text-xs"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      {...register(`items.${index}.cantidad`)}
                      className="input"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.precioUnitario`)}
                      className="input"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register(`items.${index}.descuento`)}
                      className="input"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                    {formatMoney(subtotal)}
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

            {/* Totales items */}
            <div className="flex justify-end pt-3 border-t border-gray-100 mt-3">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatMoney(totales.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Desc. global</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      {...register("descuentoGlobal")}
                      className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span>%</span>
                  </div>
                  <span className="text-red-400">
                    - {formatMoney(totales.subtotal - totales.total)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                  <span>Total</span>
                  <span>{formatMoney(totales.total)}</span>
                </div>
              </div>
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
                  monto: 0,
                })
              }
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Agregar pago
            </button>
          </div>

          {cobranzaFields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin pagos registrados — la venta quedará pendiente de cobro
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
                          Fecha movimiento *
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
                            step="0.01"
                            min="1"
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
                          step="0.01"
                          min="0"
                          {...register(`cobranzas.${index}.monto`, {
                            required: true,
                          })}
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

              {/* Resumen cobranza */}
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

        {/* Condiciones y logística */}
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Condición de pago
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Condición
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
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Logística y otros
            </h3>
            <div className="space-y-3">
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
                <label className="block text-xs text-gray-500 mb-1">
                  Provincia
                </label>
                <input
                  {...register("provincia")}
                  placeholder="Ej: Tucumán"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Notas
                </label>
                <textarea
                  {...register("notas")}
                  rows={2}
                  className="input resize-none"
                />
              </div>
            </div>
          </div>
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
