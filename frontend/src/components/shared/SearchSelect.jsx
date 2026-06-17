import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Escribir para buscar...',
  disabled = false,
  loading = false,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const inputRef = useRef(null)
  const listaRef = useRef(null)

  const seleccionada = options.find((o) => o.value === value)

  // Sincronizar texto con selección
  useEffect(() => {
    if (seleccionada && !abierto) {
      setBusqueda(seleccionada.label)
    }
  }, [seleccionada, abierto])

  const filtradas = busqueda && !seleccionada
    ? options.filter((o) =>
        o.label.toLowerCase().includes(busqueda.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : options

  const seleccionar = (opcion) => {
    onChange(opcion.value)
    setBusqueda(opcion.label)
    setAbierto(false)
    // Mover foco al siguiente campo
    setTimeout(() => {
      const focusables = document.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
      const idx = Array.from(focusables).indexOf(inputRef.current)
      if (idx !== -1 && focusables[idx + 1]) focusables[idx + 1].focus()
    }, 50)
  }

  const limpiar = (e) => {
    e?.preventDefault()
    onChange('')
    setBusqueda('')
    setAbierto(true)
    setIndiceActivo(0)
    inputRef.current?.focus()
  }

  const handleChange = (e) => {
    setBusqueda(e.target.value)
    setAbierto(true)
    setIndiceActivo(0)
    // Si borra el texto, limpiar selección
    if (!e.target.value) onChange('')
  }

  const handleKeyDown = (e) => {
    if (disabled) return

    if (!abierto && e.key !== 'Tab' && e.key !== 'Escape') {
      setAbierto(true)
      setIndiceActivo(0)
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setIndiceActivo((i) => Math.min(i + 1, filtradas.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setIndiceActivo((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtradas[indiceActivo]) seleccionar(filtradas[indiceActivo])
        break
      case 'Escape':
        setAbierto(false)
        if (seleccionada) setBusqueda(seleccionada.label)
        else setBusqueda('')
        break
      case 'Tab':
        // Si hay una opción activa al hacer Tab, seleccionarla
        if (abierto && filtradas[indiceActivo]) {
          seleccionar(filtradas[indiceActivo])
          // No prevenir el Tab para que siga al siguiente campo
        }
        setAbierto(false)
        break
    }
  }

  const handleFocus = () => {
    setAbierto(true)
    setIndiceActivo(0)
    // Seleccionar todo el texto al enfocar para facilitar reemplazo
    inputRef.current?.select()
  }

  const handleBlur = () => {
    setTimeout(() => {
      setAbierto(false)
      if (seleccionada) setBusqueda(seleccionada.label)
      else setBusqueda('')
    }, 150)
  }

  // Scroll al item activo
  useEffect(() => {
    if (listaRef.current) {
      const items = listaRef.current.querySelectorAll('[data-item]')
      items[indiceActivo]?.scrollIntoView({ block: 'nearest' })
    }
  }, [indiceActivo])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={busqueda}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={loading ? 'Cargando...' : placeholder}
          disabled={disabled || loading}
          className={`input w-full pr-7 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onMouseDown={limpiar}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {abierto && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div ref={listaRef} className="max-h-52 overflow-y-auto">
            {filtradas.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
            ) : (
              filtradas.map((opcion, i) => (
                <button
                  key={opcion.value}
                  data-item
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); seleccionar(opcion) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex flex-col ${
                    i === indiceActivo
                      ? 'bg-blue-600 text-white'
                      : opcion.value === value
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{opcion.label}</span>
                  {opcion.sublabel && (
                    <span className={`text-xs ${i === indiceActivo ? 'text-blue-200' : 'text-gray-400'}`}>
                      {opcion.sublabel}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">↑↓ navegar · Enter/Tab seleccionar · Esc cancelar</p>
          </div>
        </div>
      )}
    </div>
  )
}