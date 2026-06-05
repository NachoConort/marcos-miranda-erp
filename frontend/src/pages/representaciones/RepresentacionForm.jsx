import { useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'

const PLAZOS = [
  { value: 'contado',  label: 'Contado'  },
  { value: '15_dias',  label: '15 días'  },
  { value: '30_dias',  label: '30 días'  },
  { value: '60_dias',  label: '60 días'  },
  { value: '90_dias',  label: '90 días'  },
]

export default function RepresentacionForm({ register, control, errors }) {
  const {
    fields: contactos, append: addContacto, remove: removeContacto,
  } = useFieldArray({ control, name: 'contactos' })

  const {
    fields: cuentas, append: addCuenta, remove: removeCuenta,
  } = useFieldArray({ control, name: 'cuentasBancarias' })

  return (
    <div className="space-y-5">

      {/* Datos principales */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Datos principales</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fantasía *</label>
            <input
              {...register('fantasia', { required: 'Requerido' })}
              className="input"
              placeholder="Ej: Coca Cola"
            />
            {errors.fantasia && <p className="text-xs text-red-500 mt-1">{errors.fantasia.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Razón social</label>
            <input {...register('razonSocial')} className="input" placeholder="Ej: Coca Cola FEMSA S.A." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CUIT</label>
            <input {...register('cuit')} className="input" placeholder="30-00000000-0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Canal</label>
            <input {...register('canal')} className="input" placeholder="Ej: Mayorista, Minorista" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plazo de pago</label>
            <select {...register('plazoPago')} className="input">
              <option value="">Sin especificar</option>
              {PLAZOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas comisión</label>
            <input {...register('notasComision')} className="input" placeholder="Ej: 5% sobre factura" />
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Ubicación</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Domicilio</label>
            <input {...register('domicilio')} className="input" placeholder="Ej: Av. Corrientes 1234" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Localidad</label>
            <input {...register('localidad')} className="input" placeholder="Ej: Buenos Aires" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provincia</label>
            <input {...register('provincia')} className="input" placeholder="Ej: Buenos Aires" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código postal</label>
            <input {...register('codigoPostal')} className="input" placeholder="Ej: 1043" />
          </div>
        </div>
      </div>

      {/* Contactos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Contactos</h3>
            <p className="text-xs text-gray-400 mt-0.5">Personas de contacto en la representación</p>
          </div>
          <button
            type="button"
            onClick={() => addContacto({ nombre: '', numero: '', mail: '', cargo: '' })}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> Agregar contacto
          </button>
        </div>

        {contactos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Sin contactos cargados</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-3 text-xs text-gray-400 px-1">
              <span className="col-span-3">Nombre</span>
              <span className="col-span-2">Cargo</span>
              <span className="col-span-3">Número</span>
              <span className="col-span-3">Mail</span>
              <span className="col-span-1" />
            </div>
            {contactos.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <input
                    {...register(`contactos.${index}.nombre`, { required: true })}
                    placeholder="Nombre"
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    {...register(`contactos.${index}.cargo`)}
                    placeholder="Cargo"
                    className="input"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    {...register(`contactos.${index}.numero`)}
                    placeholder="Ej: 381 000-0000"
                    className="input"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="email"
                    {...register(`contactos.${index}.mail`)}
                    placeholder="mail@empresa.com"
                    className="input"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => removeContacto(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cuentas bancarias */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Cuentas bancarias</h3>
            <p className="text-xs text-gray-400 mt-0.5">Para facturas y pagos en negro</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addCuenta({ tipo: 'factura', banco: '', titular: '', cbu: '', alias: '', moneda: 'pesos' })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Factura
            </button>
            <button
              type="button"
              onClick={() => addCuenta({ tipo: 'negro', banco: '', titular: '', cbu: '', alias: '', moneda: 'pesos' })}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Plus size={13} /> En negro
            </button>
          </div>
        </div>

        {cuentas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Sin cuentas bancarias cargadas</p>
        ) : (
          <div className="space-y-3">
            {cuentas.map((field, index) => (
              <div key={field.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge text-xs ${
                    field.tipo === 'factura'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {field.tipo === 'factura' ? 'Cuenta factura' : 'Cuenta en negro'}
                  </span>
                  <button type="button" onClick={() => removeCuenta(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Banco</label>
                    <input {...register(`cuentasBancarias.${index}.banco`)} placeholder="Ej: Galicia" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Titular</label>
                    <input {...register(`cuentasBancarias.${index}.titular`)} placeholder="Titular de la cuenta" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CBU</label>
                    <input {...register(`cuentasBancarias.${index}.cbu`)} placeholder="22 dígitos" className="input font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Alias</label>
                    <input {...register(`cuentasBancarias.${index}.alias`)} placeholder="alias.banco.cbu" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                    <select {...register(`cuentasBancarias.${index}.moneda`)} className="input">
                      <option value="pesos">Pesos ($)</option>
                      <option value="dolar">Dólar (USD)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Notas</h3>
        <textarea {...register('notas')} rows={3} className="input resize-none" placeholder="Observaciones adicionales..." />
      </div>
    </div>
  )
}