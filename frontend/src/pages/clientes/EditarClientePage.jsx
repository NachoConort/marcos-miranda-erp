import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { clientesService } from '@/services/clientes.service'
import api from '@/services/api'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function EditarClientePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesService.getById(id),
  })

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { representaciones: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'representaciones' })

  const { data: representacionesData } = useQuery({
    queryKey: ['representaciones'],
    queryFn: () => api.get('/representaciones').then((r) => r.data),
  })

  // Cargar datos del cliente en el formulario
  useEffect(() => {
    if (!data?.cliente) return
    const c = data.cliente
    reset({
      razonSocial: c.razonSocial,
      fantasia: c.fantasia,
      rubro: c.rubro,
      cuit: c.cuit,
      numero: c.numero,
      domicilio: c.domicilio,
      localidad: c.localidad,
      provincia: c.provincia,
      codigoPostal: c.codigoPostal,
      transporte: c.transporte,
      contacto: c.contacto,
      mail: c.mail,
      telefono: c.telefono,
      notas: c.notas,
      representaciones: c.representaciones?.map((r) => ({
        representacion: r.representacion?._id || r.representacion,
        porcentajeComision: r.porcentajeComision,
        porcentajeDescuento: r.porcentajeDescuento,
      })) || [],
    })
  }, [data, reset])

  const { mutate: editar, isPending } = useMutation({
    mutationFn: (formData) => clientesService.editar(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes'])
      navigate('/clientes')
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al guardar'),
  })

  const representaciones = representacionesData?.items || []

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clientes')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Editar cliente</h2>
          <p className="text-sm text-gray-500">{data?.cliente?.razonSocial}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => editar(d))} className="space-y-5">

        {/* Datos principales */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Datos principales</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Razón social *</label>
              <input {...register('razonSocial', { required: 'Requerido' })} className="input" />
              {errors.razonSocial && <p className="text-xs text-red-500 mt-1">{errors.razonSocial.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fantasía</label>
              <input {...register('fantasia')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CUIT</label>
              <input {...register('cuit')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rubro</label>
              <input {...register('rubro')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Número de cliente</label>
              <input {...register('numero')} className="input" />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Ubicación</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Domicilio</label>
              <input {...register('domicilio')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Localidad</label>
              <input {...register('localidad')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Provincia</label>
              <input {...register('provincia')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código postal</label>
              <input {...register('codigoPostal')} className="input" />
            </div>
          </div>
        </div>

        {/* Contacto y logística */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Contacto y logística</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contacto</label>
              <input {...register('contacto')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mail</label>
              <input type="email" {...register('mail')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input {...register('telefono')} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transporte</label>
              <input {...register('transporte')} className="input" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notas</label>
              <input {...register('notas')} className="input" />
            </div>
          </div>
        </div>

        {/* Representaciones */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Representaciones</h3>
              <p className="text-xs text-gray-400 mt-0.5">Representaciones a las que compra y sus condiciones</p>
            </div>
            <button
              type="button"
              onClick={() => append({ representacion: '', porcentajeComision: 0, porcentajeDescuento: 0 })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Agregar
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin representaciones asignadas</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 text-xs text-gray-400 px-1">
                <span className="col-span-6">Representación</span>
                <span className="col-span-2 text-center">% Comisión</span>
                <span className="col-span-2 text-center">% Descuento</span>
                <span className="col-span-2" />
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6">
                    <select
                      {...register(`representaciones.${index}.representacion`, { required: true })}
                      className="input"
                    >
                      <option value="">Seleccionar</option>
                      {representaciones.map((r) => (
                        <option key={r._id} value={r._id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" max="100" step="0.1"
                      {...register(`representaciones.${index}.porcentajeComision`)}
                      className="input text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" max="100" step="0.1"
                      {...register(`representaciones.${index}.porcentajeDescuento`)}
                      className="input text-center"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">
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