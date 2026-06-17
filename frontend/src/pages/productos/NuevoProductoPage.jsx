import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { productosService } from '@/services/productos.service'
import { ArrowLeft } from 'lucide-react'
import ProductoForm from './ProductoForm'

export default function NuevoProductoPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      representaciones: [],
      moneda: 'pesos',
      porcentajeIva: 21,
      stockeable: false,
      cantidadDisponible: 0,
      habilitado: true,
      costo: 0,
    },
  })

  const { mutate: crear, isPending } = useMutation({
    mutationFn: (data) => productosService.crear(data),
    onSuccess: () => navigate('/productos'),
    onError: (err) => alert(err.response?.data?.message || 'Error al crear el producto'),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/productos')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nuevo producto</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => crear(data))}>
        <ProductoForm register={register} watch={watch} setValue={setValue} errors={errors} />

        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={() => navigate('/productos')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}