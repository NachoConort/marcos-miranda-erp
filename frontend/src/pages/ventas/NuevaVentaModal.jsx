import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ventasService } from '@/services/ventas.service'
import api from '@/services/api'
import useAuthStore from '@/store/auth.store'
import { X, Plus, Trash2 } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

export default function NuevaVentaModal({ onClose, onSuccess }) {
  const { usuario } = useAuthStore()
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('')
  const [listaPrecios, setListaPrecios] = useState([])
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 })

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }],
      descuentoGlobal: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const descuentoGlobal = watch('descuentoGlobal')

  // Calcular totales en tiempo real
  useEffect(() => {
    const subtotal = items.reduce((acc, item) => {
      const precio = Number(item.precioUnitario) || 0
      const cant = Number(item.cantidad) || 0
      const desc = Number(item.descuento) || 0
      return acc + precio * cant * (1 - desc / 100)
    }, 0)
    const total = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100)
    setTotales({ subtotal, total })
  }, [items, descuentoGlobal])

  // Cargar empresas con permiso del vendedor
  const { data: permisosData } = useQuery({
    queryKey: ['permisos', usuario._id],
    queryFn: () => api.get('/permisos', { params: { vendedor: usuario._id, activo: true } }).then((r) => r.data),
  })

  // Cargar clientes del vendedor
  const { data: clientesData } = useQuery({
    queryKey: ['clientes', usuario._id],
    queryFn: () => api.get('/clientes', { params: { vendedor: usuario._id } }).then((r) => r.data),
  })

  // Cuando cambia la empresa, cargar lista de precios
  useEffect(() => {
    if (!empresaSeleccionada) return
    api.get('/listas-precios', {
      params: { vendedor: usuario._id, empresa: empresaSeleccionada, activa: true },
    }).then((r) => setListaPrecios(r.data.items?.[0]?.items || []))
  }, [empresaSeleccionada])

  // Autocompletar ítem desde la lista de precios
  const autocompletarItem = (index, itemListaId) => {
    const itemLista = listaPrecios.find((i) => i._id === itemListaId)
    if (!itemLista) return
    setValue(`items.${index}.descripcion`, itemLista.descripcion)
    setValue(`items.${index}.precioUnitario`, itemLista.precio)
    setValue(`items.${index}.codigo`, itemLista.codigo)
    setValue(`items.${index}.unidad`, itemLista.unidad)
    setValue(`items.${index}.itemListaId`, itemLista._id)
    setValue(`items.${index}.precioOriginalLista`, itemLista.precio)
  }

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => ventasService.crear(data),
    onSuccess,
    onError: (err) => alert(err.response?.data?.message || 'Error al crear la venta'),
  })

  const onSubmit = (data) => {
    const itemsCalculados = data.items.map((item) => ({
      ...item,
      subtotal: Number(item.precioUnitario) * Number(item.cantidad) * (1 - Number(item.descuento || 0) / 100),
    }))
    crear({ ...data, empresa: empresaSeleccionada, items: itemsCalculados })
  }

  const empresas = permisosData?.items?.map((p) => p.empresa) || []
  const clientes = clientesData?.items || []

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nueva venta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {/* Empresa y Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
              <select
                value={empresaSeleccionada}
                onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar empresa</option>
                {empresas.map((e) => (
                  <option key={e._id} value={e._id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                {...register('cliente', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c._id} value={c._id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Productos</label>
              <button
                type="button"
                onClick={() => append({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus size={13} /> Agregar ítem
              </button>
            </div>

            <div className="space-y-2">
              {/* Header de columnas */}
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
                <span className="col-span-4">Descripción</span>
                <span className="col-span-2">Precio unit.</span>
                <span className="col-span-2">Cantidad</span>
                <span className="col-span-1">Desc %</span>
                <span className="col-span-2 text-right">Subtotal</span>
                <span className="col-span-1"></span>
              </div>

              {fields.map((field, index) => {
                const precio = Number(items[index]?.precioUnitario) || 0
                const cant = Number(items[index]?.cantidad) || 0
                const desc = Number(items[index]?.descuento) || 0
                const subtotal = precio * cant * (1 - desc / 100)

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      {listaPrecios.length > 0 ? (
                        <select
                          onChange={(e) => autocompletarItem(index, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar o escribir</option>
                          {listaPrecios.map((i) => (
                            <option key={i._id} value={i._id}>{i.descripcion}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          {...register(`items.${index}.descripcion`, { required: true })}
                          placeholder="Descripción"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.precioUnitario`, { required: true, min: 0 })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.cantidad`, { required: true, min: 0.01 })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        {...register(`items.${index}.descuento`)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
          </div>

          {/* Totales y opciones */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select
                  {...register('metodoPago')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin especificar</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cuenta_corriente">Cuenta corriente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  {...register('notas')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Resumen de totales */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatMoney(totales.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <label className="flex items-center gap-2">
                  Descuento global
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...register('descuentoGlobal')}
                    className="w-16 border border-gray-200 rounded px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  %
                </label>
                <span className="text-red-500">- {formatMoney(totales.subtotal - totales.total)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2 text-base">
                <span>Total</span>
                <span>{formatMoney(totales.total)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando...' : 'Crear venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}