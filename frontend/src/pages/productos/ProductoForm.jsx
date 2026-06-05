import { useQuery } from '@tanstack/react-query'
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
  const disponiblePara = watch('disponiblePara') || []

  const toggleRepresentacion = (id) => {
    const actuales = representacionesSeleccionadas
    const nuevo = actuales.includes(id)
      ? actuales.filter((r) => r !== id)
      : [...actuales, id]
    setValue('representaciones', nuevo)
  }

  const toggleDisponible = (valor) => {
    const actuales = disponiblePara
    const nuevo = actuales.includes(valor)
      ? actuales.filter((d) => d !== valor)
      : [...actuales, valor]
    setValue('disponiblePara', nuevo)
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
            <input {...register('codigoBarra')} className="input font-mono" placeholder="Ej: 7790001234567" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de producto</label>
            <input {...register('tipoProducto')} className="input" placeholder="Ej: Bebida, Snack" />
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
            <label className="block text-xs text-gray-500 mb-1">Marca</label>
            <input {...register('marca')} className="input" placeholder="Ej: Coca Cola" />
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rubro</label>
            <input {...register('rubro')} className="input" placeholder="Ej: Bebidas" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub rubro</label>
            <input {...register('subRubro')} className="input" placeholder="Ej: Gaseosas" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Unidad de medida</label>
            <input {...register('unidadMedida')} className="input" placeholder="Ej: unidad, caja, kg" />
          </div>
        </div>

        {/* Representaciones */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-2">Representaciones</label>
          {representacionesDisponibles.length === 0 ? (
            <p className="text-xs text-gray-400">No hay representaciones disponibles</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {representacionesDisponibles.map((r) => {
                const seleccionado = representacionesSeleccionadas.includes(r._id)
                return (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => toggleRepresentacion(r._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      seleccionado
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

      {/* Precios y costos */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Precio y costos</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo</label>
            <input
              type="number" step="0.01" min="0"
              {...register('costo')}
              className="input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Moneda</label>
            <select {...register('moneda')} className="input">
              <option value="pesos">Pesos ($)</option>
              <option value="dolar">Dólar (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Porcentaje IVA</label>
            <select {...register('porcentajeIva', { valueAsNumber: true })} className="input">
              {IVA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stock y disponibilidad */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Stock y disponibilidad</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" {...register('stockeable')} className="rounded" />
              Stockeable
            </label>
          </div>
          {stockeable && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantidad disponible</label>
              <input
                type="number" min="0" step="1"
                {...register('cantidadDisponible', { valueAsNumber: true })}
                className="input"
              />
            </div>
          )}
        </div>

        {/* Disponible para */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-2">Disponible para</label>
          <div className="flex gap-3">
            {['ventas', 'compras'].map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => toggleDisponible(opcion)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  disponiblePara.includes(opcion)
                    ? opcion === 'ventas'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>

        {/* Habilitado */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" {...register('habilitado')} className="rounded" />
            Habilitado
          </label>
        </div>
      </div>
    </div>
  )
}