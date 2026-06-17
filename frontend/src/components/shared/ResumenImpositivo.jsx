const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n || 0)

// Calcula el desglose a partir de los items y el descuento global
export const calcularResumenImpositivo = (items = [], descuentoGlobal = 0) => {
  // Subtotal bruto por alícuota (antes del descuento global)
  const porAlicuota = { 0: 0, 10.5: 0, 21: 0, 27: 0 }

  items.forEach((item) => {
    const precio = Number(item.precioUnitario) || 0
    const cant = Number(item.cantidad) || 0
    const desc = Math.min(Number(item.descuento) || 0, 100)
    const subtotalItem = precio * cant * (1 - desc / 100)
    const iva = Number(item.porcentajeIva ?? 21) // default 21 si no viene

    if (porAlicuota[iva] !== undefined) porAlicuota[iva] += subtotalItem
    else porAlicuota[21] += subtotalItem // si el iva no está en el enum, va a 21
  })

  // Aplicar descuento global a cada alícuota
  const factorDesc = 1 - Math.min(Number(descuentoGlobal) || 0, 100) / 100
  const neto = { 0: 0, 10.5: 0, 21: 0, 27: 0 }
  Object.keys(porAlicuota).forEach((k) => {
    // El neto es la base sin IVA: subtotal / (1 + iva/100)
    const subtotalConDesc = porAlicuota[k] * factorDesc
    const pct = Number(k) / 100
    neto[k] = pct > 0 ? subtotalConDesc / (1 + pct) : subtotalConDesc
  })

  const ivaMontos = { 0: 0, 10.5: 0, 21: 0, 27: 0 }
  Object.keys(neto).forEach((k) => {
    ivaMontos[k] = neto[k] * (Number(k) / 100)
  })

  const importeNeto = Object.values(neto).reduce((a, b) => a + b, 0)
  const totalIva = Object.values(ivaMontos).reduce((a, b) => a + b, 0)
  const total = importeNeto + totalIva

  return { neto, ivaMontos, importeNeto, totalIva, total }
}

export default function ResumenImpositivo({ items = [], descuentoGlobal = 0, className = '' }) {
  const { neto, ivaMontos, importeNeto, totalIva, total } =
    calcularResumenImpositivo(items, descuentoGlobal)

  const alicuotas = [27, 21, 10.5, 0]
  const alicuotasConValor = alicuotas.filter((a) => ivaMontos[a] > 0)

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <table className="w-full text-sm">
        <tbody>
          {/* Importe neto */}
          <tr className="border-b border-gray-100">
            <td className="px-4 py-2.5 text-gray-600">Importe neto gravado</td>
            <td className="px-4 py-2.5 text-right font-medium text-gray-800">
              {formatMoney(importeNeto)}
            </td>
          </tr>

          {/* IVA por alícuota — solo mostrar las que tienen valor */}
          {alicuotas.map((a) => (
            <tr key={a} className="border-b border-gray-100">
              <td className={`px-4 py-2.5 ${ivaMontos[a] > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                IVA {a}%
              </td>
              <td className={`px-4 py-2.5 text-right font-medium ${ivaMontos[a] > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                {formatMoney(ivaMontos[a])}
              </td>
            </tr>
          ))}

          {/* Total IVA */}
          {totalIva > 0 && (
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="px-4 py-2.5 text-gray-600 font-medium">Total IVA</td>
              <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                {formatMoney(totalIva)}
              </td>
            </tr>
          )}

          {/* Total */}
          <tr className="bg-blue-50">
            <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
            <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">
              {formatMoney(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}