import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { representacionesService } from '@/services/representaciones.service'
import { ArrowLeft } from 'lucide-react'
import RepresentacionForm from './RepresentacionForm'

export default function EditarRepresentacionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['representacion', id],
    queryFn: () => representacionesService.getById(id),
  })

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { contactos: [], cuentasBancarias: [] },
  })

  useEffect(() => {
    if (!data?.representacion) return
    const r = data.representacion
    reset({
      fantasia: r.fantasia,
      canal: r.canal,
      razonSocial: r.razonSocial,
      cuit: r.cuit,
      provincia: r.provincia,
      localidad: r.localidad,
      domicilio: r.domicilio,
      codigoPostal: r.codigoPostal,
      plazoPago: r.plazoPago,
      notasComision: r.notasComision,
      notas: r.notas,
      contactos: r.contactos || [],
      cuentasBancarias: r.cuentasBancarias || [],
    })
  }, [data, reset])

  const { mutate: editar, isPending } = useMutation({
    mutationFn: (formData) => representacionesService.editar(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['representaciones'])
      navigate('/representaciones')
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al guardar'),
  })

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/representaciones')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Editar representación</h2>
          <p className="text-sm text-gray-500">{data?.representacion?.fantasia}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => editar(d))}>
        <RepresentacionForm register={register} control={control} errors={errors} />

        {/* Listas de precio y comisiones (solo lectura, se gestionan desde sus módulos) */}
        {(data?.listas?.length > 0 || data?.comisiones?.length > 0) && (
          <div className="card mt-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Configuraciones activas</h3>
            <div className="grid grid-cols-2 gap-4">
              {data?.listas?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Listas de precio</p>
                  <div className="space-y-1">
                    {data.listas.map((l) => (
                      <div key={l._id} className="flex justify-between text-xs bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700">{l.vendedor?.nombre}</span>
                        <span className="text-gray-400">{l.nombre || 'Sin nombre'} — {l.items?.length} ítems</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data?.comisiones?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Comisiones configuradas</p>
                  <div className="space-y-1">
                    {data.comisiones.map((c) => (
                      <div key={c._id} className="flex justify-between text-xs bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700">{c.vendedor?.nombre}</span>
                        <span className="text-gray-400">{c.porcentaje}% — {c.tipo === 'con_factura' ? 'c/ factura' : 'en negro'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={() => navigate('/representaciones')} className="btn-secondary">
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