import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { presupuestosService } from '@/services/presupuestos.service'
import { useFormData } from '@/hooks/useFormData'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const calcularMonto = (total, porcentaje, tipo) => {
  if (!total || !porcentaje) return 0
  if (tipo === 'con_factura') return Math.round((total / 1.21) * (porcentaje / 100) * 100) / 100
  return Math.round(total * (porcentaje / 100) * 100) / 100
}

export default function NuevoPresupuestoPage() {
  const navigate = useNavigate()
  const [representacionId, setRepresentacionId] = useState('')
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 })
  const [tieneComprobante, setTieneComprobante] = useState(false)

  const { representaciones, clientes, listaPrecios, productos, loading } = useFormData(representacionId)

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 }],
      descuentoGlobal: 0,
      comisionRepresentacion: { porcentaje: 0, tipo: 'con_factura' },
      comisionVendedor: { porcentaje: 0, tipo: 'con_factura' },
      estado: 'borrador',
      validezDias: 30,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const descuentoGlobal = watch('descuentoGlobal')
  const comRepPct = watch('comisionRepresentacion.porcentaje')
  const comRepTipo = watch('comisionRepresentacion.tipo')
  const comVendPct = watch('comisionVendedor.porcentaje')
  const comVendTipo = watch('comisionVendedor.tipo')

  useEffect(() => {
    const subtotal = items.reduce((acc, item) =>
      acc + (Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0) * (1 - (Number(item.descuento) || 0) / 100), 0)
    const total = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100)
    setTotales({ subtotal, total })
  }, [items, descuentoGlobal])

  // Precargar comisiones cuando cambia la representación
  useEffect(() => {
    if (!representacionId) return
    presupuestosService.getComisionesDefault(representacionId).then((data) => {
      if (data.comisionVendedor) {
        setValue('comisionVendedor.porcentaje', data.comisionVendedor.porcentaje)
        setValue('comisionVendedor.tipo', data.comisionVendedor.tipo)
      }
      if (data.comisionRepresentacion) {
        setValue('comisionRepresentacion.porcentaje', data.comisionRepresentacion.porcentaje)
        setValue('comisionRepresentacion.tipo', data.comisionRepresentacion.tipo)
      }
    })
  }, [representacionId])

  // Autocompletar ítem desde producto o lista de precios
  const autocompletarItem = (index, productoId) => {
    // Primero buscar en lista de precios
    const itemLista = listaPrecios.find((i) => i._id === productoId || i.codigo === productoId)
    if (itemLista) {
      setValue(`items.${index}.descripcion`, itemLista.descripcion)
      setValue(`items.${index}.precioUnitario`, itemLista.precio)
      setValue(`items.${index}.codigo`, itemLista.codigo || '')
      setValue(`items.${index}.unidad`, itemLista.unidad || '')
      return
    }
    // Si no hay en lista de precios, usar el producto
    const producto = productos.find((p) => p._id === productoId)
    if (producto) {
      setValue(`items.${index}.descripcion`, producto.nombre)
      setValue(`items.${index}.precioUnitario`, producto.costo)
      setValue(`items.${index}.codigo`, producto.codigo || '')
      setValue(`items.${index}.unidad`, producto.unidadMedida || '')
    }
  }

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => presupuestosService.crear(data),
    onSuccess: () => navigate('/presupuestos'),
    onError: (err) => alert(err.response?.data?.message || 'Error al crear el presupuesto'),
  })

  const onSubmit = (data) => {
    const itemsCalculados = data.items.map((item) => ({
      ...item,
      subtotal: Number(item.precioUnitario) * Number(item.cantidad) * (1 - (Number(item.descuento) || 0) / 100),
    }))
    crear({
      ...data,
      representacion: representacionId,
      items: itemsCalculados,
      comprobante: tieneComprobante ? data.comprobante : null,
    })
  }

  const montoComRep = calcularMonto(totales.total, Number(comRepPct), comRepTipo)
  const montoComVend = calcularMonto(totales.total, Number(comVendPct), comVendTipo)
  const opcionesProductos = listaPrecios.length > 0 ? listaPrecios : productos

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/presupuestos')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">Nuevo presupuesto</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Datos generales */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Datos generales</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Representación *</label>
              <select
                value={representacionId}
                onChange={(e) => setRepresentacionId(e.target.value)}
                className="input"
                required
                disabled={loading}
              >
                <option value="">{loading ? 'Cargando...' : 'Seleccionar'}</option>
                {representaciones.map((r) => (
                  <option key={r._id} value={r._id}>{r.fantasia || r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
              <select {...register('cliente', { required: true })} className="input" disabled={loading}>
                <option value="">{loading ? 'Cargando...' : 'Seleccionar'}</option>
                {clientes.map((c) => (
                  <option key={c._id} value={c._id}>{c.fantasia || c.razonSocial}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha comprobante</label>
              <input type="date" {...register('fechaComprobante')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select {...register('estado')} className="input">
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Personal</label>
              <input {...register('personal')} className="input" placeholder="Ej: Carlos" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Validez (días)</label>
              <input type="number" min="1" {...register('validezDias')} className="input" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
              <textarea {...register('observaciones')} rows={2} className="input resize-none" />
            </div>
          </div>
        </div>

        {/* Comprobante opcional */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Comprobante</h3>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={tieneComprobante} onChange={(e) => setTieneComprobante(e.target.checked)} className="rounded" />
              Tiene comprobante
            </label>
          </div>
          {tieneComprobante && (
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select {...register('comprobante.tipo')} className="input">
                  <option value="factura">Factura</option>
                  <option value="comprobante">Comprobante</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Letra</label>
                <select {...register('comprobante.letra')} className="input">
                  {['A','B','C','X'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Punto de venta</label>
                <input type="number" {...register('comprobante.puntoVenta')} className="input" placeholder="0001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Número</label>
                <input type="number" {...register('comprobante.numero')} className="input" placeholder="00000001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha emisión</label>
                <input type="date" {...register('comprobante.fechaEmision')} className="input" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Validación AFIP</label>
                <select {...register('comprobante.validacionAfip')} className="input">
                  <option value="pendiente">Pendiente</option>
                  <option value="validada">Validada</option>
                  <option value="no_validada">No validada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">CAE</label>
                <input {...register('comprobante.cae')} className="input" />
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Productos</h3>
              {opcionesProductos.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {listaPrecios.length > 0 ? 'Usando lista de precios' : 'Usando catálogo de productos'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => append({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Agregar ítem
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
              <span className="col-span-4">Descripción</span>
              <span className="col-span-2">Precio unit.</span>
              <span className="col-span-2">Cantidad</span>
              <span className="col-span-1">Desc %</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => {
              const precio = Number(items[index]?.precioUnitario) || 0
              const cant = Number(items[index]?.cantidad) || 0
              const desc = Number(items[index]?.descuento) || 0
              const subtotal = precio * cant * (1 - desc / 100)

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    {opcionesProductos.length > 0 ? (
                      <select
                        onChange={(e) => autocompletarItem(index, e.target.value)}
                        className="input"
                        disabled={!representacionId}
                      >
                        <option value="">Seleccionar producto</option>
                        {opcionesProductos.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.descripcion || p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...register(`items.${index}.descripcion`, { required: true })}
                        placeholder="Descripción"
                        className="input"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" min="0" {...register(`items.${index}.precioUnitario`)} className="input" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="1" min="1" {...register(`items.${index}.cantidad`)} className="input" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" step="0.1" min="0" max="100" {...register(`items.${index}.descuento`)} className="input" />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                    {formatMoney(subtotal)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>{formatMoney(totales.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Desc. global</span>
                    <input type="number" min="0" max="100" step="0.1" {...register('descuentoGlobal')}
                      className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span>%</span>
                  </div>
                  <span className="text-red-400">- {formatMoney(totales.subtotal - totales.total)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                  <span>Total</span><span>{formatMoney(totales.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comisiones */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Comisiones</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">Comisión representación</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Porcentaje</label>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.1" min="0" max="100" {...register('comisionRepresentacion.porcentaje')} className="input" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select {...register('comisionRepresentacion.tipo')} className="input">
                    <option value="con_factura">Con factura</option>
                    <option value="en_negro">En negro</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500">Monto calculado</span>
                <span className="font-semibold text-gray-800">{formatMoney(montoComRep)}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">Comisión vendedor</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Porcentaje</label>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.1" min="0" max="100" {...register('comisionVendedor.porcentaje')} className="input" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select {...register('comisionVendedor.tipo')} className="input">
                    <option value="con_factura">Con factura</option>
                    <option value="en_negro">En negro</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500">Monto calculado</span>
                <span className="font-semibold text-gray-800">{formatMoney(montoComVend)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/presupuestos')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </div>
  )
}