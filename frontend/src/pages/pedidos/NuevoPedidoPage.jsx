import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { pedidosService } from '@/services/pedidos.service'
import { useFormData } from '@/hooks/useFormData'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

export default function NuevoPedidoPage() {
  const navigate = useNavigate()
  const [representacionId, setRepresentacionId] = useState('')
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 })

  const { representaciones, clientes, listaPrecios, productos, loading } = useFormData(representacionId)

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 }],
      descuentoGlobal: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const descuentoGlobal = watch('descuentoGlobal')

  useEffect(() => {
    const subtotal = items.reduce((acc, item) =>
      acc + (Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0) * (1 - (Number(item.descuento) || 0) / 100), 0)
    const total = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100)
    setTotales({ subtotal, total })
  }, [items, descuentoGlobal])

  const autocompletarItem = (index, productoId) => {
    const itemLista = listaPrecios.find((i) => i._id === productoId)
    if (itemLista) {
      setValue(`items.${index}.descripcion`, itemLista.descripcion)
      setValue(`items.${index}.precioUnitario`, itemLista.precio)
      setValue(`items.${index}.codigo`, itemLista.codigo || '')
      setValue(`items.${index}.unidad`, itemLista.unidad || '')
      return
    }
    const producto = productos.find((p) => p._id === productoId)
    if (producto) {
      setValue(`items.${index}.descripcion`, producto.nombre)
      setValue(`items.${index}.precioUnitario`, producto.costo)
      setValue(`items.${index}.codigo`, producto.codigo || '')
      setValue(`items.${index}.unidad`, producto.unidadMedida || '')
    }
  }

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => pedidosService.crear(data),
    onSuccess: () => navigate('/pedidos'),
    onError: (err) => alert(err.response?.data?.message || 'Error al crear el pedido'),
  })

  const onSubmit = (data) => {
    const itemsCalculados = data.items.map((item) => ({
      ...item,
      subtotal: Number(item.precioUnitario) * Number(item.cantidad) * (1 - (Number(item.descuento) || 0) / 100),
    }))
    crear({ ...data, representacion: representacionId, items: itemsCalculados })
  }

  const opcionesProductos = listaPrecios.length > 0 ? listaPrecios : productos

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pedidos')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nuevo pedido</h2>
          <p className="text-sm text-gray-500">Se enviará a la representación para su confirmación</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Datos generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Representación *</label>
              <select
                value={representacionId}
                onChange={(e) => setRepresentacionId(e.target.value)}
                className="input"
                required
                disabled={loading}
              >
                <option value="">{loading ? 'Cargando...' : 'Seleccionar representación'}</option>
                {representaciones.map((r) => (
                  <option key={r._id} value={r._id}>{r.fantasia || r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
              <select {...register('cliente', { required: true })} className="input" disabled={loading}>
                <option value="">{loading ? 'Cargando...' : 'Seleccionar cliente'}</option>
                {clientes.map((c) => (
                  <option key={c._id} value={c._id}>{c.fantasia || c.razonSocial}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Notas</label>
            <textarea {...register('notas')} rows={2} className="input resize-none" />
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Productos</h3>
              {representacionId && opcionesProductos.length > 0 && (
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
                        placeholder={representacionId ? 'Descripción' : 'Seleccioná primero la representación'}
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
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100 mt-3">
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

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/pedidos')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : 'Crear pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}