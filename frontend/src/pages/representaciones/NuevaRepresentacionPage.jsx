import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { representacionesService } from '@/services/representaciones.service'
import { ArrowLeft } from 'lucide-react'
import RepresentacionForm from './RepresentacionForm'

export default function NuevaRepresentacionPage() {
  const navigate = useNavigate()

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { contactos: [], cuentasBancarias: [] },
  })

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => representacionesService.crear(data),
    onSuccess: () => navigate('/representaciones'),
    onError: (err) => alert(err.response?.data?.message || 'Error al crear la representación'),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/representaciones')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nueva representación</h2>
          <p className="text-sm text-gray-500">Completá los datos de la representación</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => crear(data))}>
        <RepresentacionForm register={register} control={control} errors={errors} />

        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={() => navigate('/representaciones')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : 'Crear representación'}
          </button>
        </div>
      </form>
    </div>
  )
}