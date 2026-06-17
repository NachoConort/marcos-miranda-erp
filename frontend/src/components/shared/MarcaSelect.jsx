import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import api from '@/services/api'

export default function MarcaSelect({ value, onChange }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [creando, setCreando] = useState(false)
  const inputRef = useRef(null)
  const listaRef = useRef(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['marcas'],
    queryFn: () => api.get('/marcas').then((r) => r.data),
  })

  const marcas = data?.marcas || []
  const seleccionada = marcas.find((m) => m._id === value)

  const filtradas = busqueda
    ? marcas.filter((m) => m.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : marcas

  // Si tiene seleccionada y no está buscando, mostrar nombre
  useEffect(() => {
    if (seleccionada && !abierto) {
      setBusqueda(seleccionada.nombre)
    }
  }, [seleccionada, abierto])

  const { mutate: crearMarca, isPending } = useMutation({
    mutationFn: (nombre) => api.post('/marcas', { nombre }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['marcas'])
      onChange(data.marca._id)
      setBusqueda(data.marca.nombre)
      setAbierto(false)
      setCreando(false)
    },
    onError: (err) => alert(err.response?.data?.message || 'Error al crear la marca'),
  })

  const seleccionar = (marca) => {
    onChange(marca._id)
    setBusqueda(marca.nombre)
    setAbierto(false)
    setCreando(false)
    // Mover foco al siguiente campo (Tab behavior)
    setTimeout(() => {
      const inputs = document.querySelectorAll('input, select, textarea, button')
      const actual = inputRef.current
      const idx = Array.from(inputs).indexOf(actual)
      if (idx !== -1 && inputs[idx + 1]) inputs[idx + 1].focus()
    }, 50)
  }

  const limpiar = () => {
    onChange('')
    setBusqueda('')
    setAbierto(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!abierto && e.key !== 'Tab') {
      setAbierto(true)
      setIndiceActivo(0)
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (creando && busqueda.trim()) {
        crearMarca(busqueda.trim())
      } else if (filtradas[indiceActivo]) {
        seleccionar(filtradas[indiceActivo])
      } else if (busqueda.trim()) {
        // No hay resultado — crear
        setCreando(true)
      }
    } else if (e.key === 'Escape') {
      setAbierto(false)
      setCreando(false)
      if (seleccionada) setBusqueda(seleccionada.nombre)
      else setBusqueda('')
    } else if (e.key === 'Tab') {
      // Dejar que Tab navegue normalmente pero cerrar el dropdown
      setAbierto(false)
      setCreando(false)
      if (!value && busqueda.trim()) {
        // Si hay texto pero no hay selección, crear la marca al hacer Tab
        crearMarca(busqueda.trim())
      }
    }
  }

  const handleChange = (e) => {
    setBusqueda(e.target.value)
    setAbierto(true)
    setIndiceActivo(0)
    setCreando(false)
    if (!e.target.value) onChange('')
  }

  const handleBlur = () => {
    // Pequeño delay para permitir clicks en el dropdown
    setTimeout(() => {
      setAbierto(false)
      setCreando(false)
      // Si hay selección, mostrar su nombre; si no, limpiar
      if (seleccionada) setBusqueda(seleccionada.nombre)
      else setBusqueda('')
    }, 150)
  }

  // Scroll automático al item activo
  useEffect(() => {
    if (listaRef.current) {
      const items = listaRef.current.querySelectorAll('[data-item]')
      items[indiceActivo]?.scrollIntoView({ block: 'nearest' })
    }
  }, [indiceActivo])

  const mostrarCrear = busqueda.trim() && filtradas.length === 0
  const mostrarSugerirCrear = busqueda.trim() && filtradas.length > 0 &&
    !filtradas.some((m) => m.nombre.toLowerCase() === busqueda.toLowerCase())

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* Input de búsqueda directa */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={busqueda}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { setAbierto(true); setIndiceActivo(0) }}
            onBlur={handleBlur}
            placeholder="Escribir marca..."
            className="input w-full pr-7"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); limpiar() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Botón + para crear marca explícitamente */}
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault()
            if (busqueda.trim()) crearMarca(busqueda.trim())
            else inputRef.current?.focus()
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          title="Crear marca con el texto ingresado"
          disabled={isPending}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-50 top-full left-0 right-8 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div ref={listaRef} className="max-h-48 overflow-y-auto">
            {filtradas.length === 0 && !mostrarCrear ? (
              <p className="text-xs text-gray-400 text-center py-3">No hay marcas</p>
            ) : (
              filtradas.map((marca, i) => (
                <button
                  key={marca._id}
                  data-item
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); seleccionar(marca) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === indiceActivo
                      ? 'bg-blue-600 text-white'
                      : marca._id === value
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {marca.nombre}
                </button>
              ))
            )}

            {/* Opción de crear */}
            {(mostrarCrear || mostrarSugerirCrear) && (
              <button
                data-item
                type="button"
                onMouseDown={(e) => { e.preventDefault(); crearMarca(busqueda.trim()) }}
                disabled={isPending}
                className={`w-full text-left px-3 py-2 text-sm border-t border-gray-100 transition-colors flex items-center gap-2 ${
                  indiceActivo === filtradas.length
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Plus size={13} />
                {isPending ? 'Creando...' : `Crear marca "${busqueda}"`}
              </button>
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">↑↓ navegar · Enter seleccionar · Tab confirmar</p>
          </div>
        </div>
      )}
    </div>
  )
}