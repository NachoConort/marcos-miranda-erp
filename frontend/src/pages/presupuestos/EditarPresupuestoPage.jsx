import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { presupuestosService } from '@/services/presupuestos.service'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const calcularMonto = (total, porcentaje, tipo) => {
  if (!total || !porcentaje) return 0
  if (tipo === 'con_factura') return Math.round((total / 1.21) * (porcentaje / 100) * 100) / 100
  return Math.round(total * (porcentaje / 100) * 100) / 100
}

export default function EditarPresupuestoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [totales, setTotales] = useState({ subtotal: 0, total: 0 })
  const [tieneComprobante, setTieneComprobante] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['presupuesto', id],
    queryFn: () => presupuestosService.getById(id),
  })

  const { register, control, handleSubmit, watch, reset } = useForm({
    defaultValues: { items: [], descuentoGlobal: 0 },
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

  useEffect(() => {
    if (!data?.presupuesto) return
    const p = data.presupuesto
    setTieneComprobante(!!p.comprobante?.tipo)
    reset({
      cliente: p.cliente?._id,
      fechaComprobante: p.fechaComprobante?.slice(0, 10),
      estado: p.estado,
      personal: p.personal,
      observaciones: p.observaciones,
      validezDias: p.validezDias,
      descuentoGlobal: p.descuentoGlobal,
      items: p.items || [],
      comprobante: p.comprobante || {},
      comisionRepresentacion: p.comisionRepresentacion || { porcentaje: 0, tipo: 'con_factura' },
      comisionVendedor: p.comisionVendedor || { porcentaje: 0, tipo: 'con_factura' },
    })
  }, [data, reset])

  const { mutate: editar, isPending } = useMutation({
    mutationFn: (formData) => presupuestosService.editar(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['presupuestos'])
      navigate('/presupuestos')
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al guardar'),
  })

  const onSubmit = (formData) => {
    const itemsCalculados = formData.items.map((item) => ({
      ...item,
      subtotal: Number(item.precioUnitario) * Number(item.cantidad) * (1 - (Number(item.descuento) || 0) / 100),
    }))
    editar({
      ...formData,
      items: itemsCalculados,
      comprobante: tieneComprobante ? formData.comprobante : null,
    })
  }

  const montoComRep = calcularMonto(totales.total, Number(comRepPct), comRepTipo)
  const montoComVend = calcularMonto(totales.total, Number(comVendPct), comVendTipo)

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/presupuestos')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Editar presupuesto #{data?.presupuesto?.numero}</h2>
          <p className="text-sm text-gray-500">{data?.presupuesto?.representacion?.fantasia} — {data?.presupuesto?.cliente?.fantasia || data?.presupuesto?.cliente?.razonSocial}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Datos generales */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Datos generales</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha comprobante</label>
              <input type="date" {...register('fechaComprobante')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select {...register('estado')} className="input">
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                <option value="rechazado">Rechazado</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Personal</label>
              <input {...register('personal')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Validez (días)</label>
              <input type="number" min="1" {...register('validezDias')} className="input" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
              <input {...register('observaciones')} className="input" />
            </div>
          </div>
        </div>

        {/* Comprobante opcional */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Comprobante</h3>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={tieneComprobante}
                onChange={(e) => setTieneComprobante(e.target.checked)}
                className="rounded"
              />
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
                <input type="number" {...register('comprobante.puntoVenta')} className="input" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Número</label>
                <input type="number" {...register('comprobante.numero')} className="input" />
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Productos</h3>
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
                    <input {...register(`items.${index}.descripcion`, { required: true })} className="input" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" {...register(`items.${index}.precioUnitario`)} className="input" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="1" {...register(`items.${index}.cantidad`)} className="input" />
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
                    <input
                      type="number" min="0" max="100" step="0.1"
                      {...register('descuentoGlobal')}
                      className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
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
          <button type="button" onClick={() => navigate('/presupuestos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}