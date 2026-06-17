import { useQuery } from '@tanstack/react-query'
import MarcaSelect from '@/components/shared/MarcaSelect'
import api from '@/services/api'

const IVA_OPTIONS = [
  { value: 0,    label: '0%'    },
  { value: 10.5, label: '10.5%' },
  { value: 21,   label: '21%'   },
  { value: 27,   label: '27%'   },
]

export default function ProductoForm({ register, watch, setValue, errors }) {
  const { data: representacionesData } = useQuery({
    queryKey: ['representaciones'],
    queryFn: () => api.get('/representaciones').then((r) => r.data),
  })

  const representacionesDisponibles = representacionesData?.items || []
  const representacionesSeleccionadas = watch('representaciones') || []
  const stockeable = watch('stockeable')
  const marcaId = watch('marca')

  const toggleRepresentacion = (id) => {
    const actuales = representacionesSeleccionadas
    const nuevo = actuales.includes(id)
      ? actuales.filter((r) => r !== id)
      : [...actuales, id]
    setValue('representaciones', nuevo)
  }

  return (
    <div className="space-y-5">

      {/* Identificación */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Identificación</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código</label>
            <input {...register('codigo')} className="input" placeholder="Ej: PROD-001" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código de barra</label>
            <input {...register('codigoBarra')} className="input font-mono" placeholder="7790001234567" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Marca</label>
            <MarcaSelect value={marcaId} onChange={(id) => setValue('marca', id)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
            <input
              {...register('nombre', { required: 'Requerido' })}
              className="input"
              placeholder="Nombre del producto"
            />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Unidad de medida</label>
            <input {...register('unidadMedida')} className="input" placeholder="Ej: unidad, caja, kg" />
          </div>
          <div className="col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <textarea {...register('descripcion')} rows={2} className="input resize-none" placeholder="Descripción del producto..." />
          </div>
        </div>
      </div>

      {/* Clasificación */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Clasificación</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rubro</label>
            <input {...register('rubro')} className="input" placeholder="Ej: Bebidas" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub rubro</label>
            <input {...register('subRubro')} className="input" placeholder="Ej: Gaseosas" />
          </div>
        </div>

        {/* Representaciones */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Representaciones</label>
          {representacionesDisponibles.length === 0 ? (
            <p className="text-xs text-gray-400">No hay representaciones disponibles</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {representacionesDisponibles.map((r) => {
                const sel = representacionesSeleccionadas.includes(r._id)
                return (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => toggleRepresentacion(r._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      sel
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {r.fantasia || r.nombre}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Precio y costo */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Precio y costo</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo</label>
            <input type="number" step="0.01" min="0" {...register('costo')} className="input" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Moneda</label>
            <select {...register('moneda')} className="input">
              <option value="pesos">Pesos ($)</option>
              <option value="dolar">Dólar (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">IVA</label>
            <select {...register('porcentajeIva', { valueAsNumber: true })} className="input">
              {IVA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Stock</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('stockeable')} className="rounded" />
            Producto stockeable
          </label>

          {stockeable && (
            <div className="pl-5 space-y-3 border-l-2 border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" {...register('aceptaStockNegativo')} className="rounded" />
                Acepta stock negativo
              </label>
              <div className="w-48">
                <label className="block text-xs text-gray-500 mb-1">Cantidad disponible</label>
                <input
                  type="number"
                  {...register('cantidadDisponible', { valueAsNumber: true })}
                  className="input"
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Estado</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" {...register('habilitado')} className="rounded" />
          Producto habilitado
        </label>
      </div>
    </div>
  )
}