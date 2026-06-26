const formatMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

export const calcularResumenImpositivo = (items = [], descuentoGlobal = 0) => {
  const porAlicuota = { 0: 0, 10.5: 0, 21: 0, 27: 0 };

  items.forEach((item) => {
    const precio = Number(item.precioUnitario) || 0;
    const cant = Number(item.cantidad) || 0;
    const desc = Math.min(Number(item.descuento) || 0, 100);
    const subtotalItem = precio * cant * (1 - desc / 100);
    const iva = Number(item.porcentajeIva ?? 21);

    if (porAlicuota[iva] !== undefined) porAlicuota[iva] += subtotalItem;
    else porAlicuota[21] += subtotalItem;
  });

  const factorDesc = 1 - Math.min(Number(descuentoGlobal) || 0, 100) / 100;
  const neto = { 0: 0, 10.5: 0, 21: 0, 27: 0 };
  Object.keys(porAlicuota).forEach((k) => {
    const subtotalConDesc = porAlicuota[k] * factorDesc;
    const pct = Number(k) / 100;
    neto[k] = pct > 0 ? subtotalConDesc / (1 + pct) : subtotalConDesc;
  });

  const ivaMontos = { 0: 0, 10.5: 0, 21: 0, 27: 0 };
  Object.keys(neto).forEach((k) => {
    ivaMontos[k] = neto[k] * (Number(k) / 100);
  });

  const importeNeto = Object.values(neto).reduce((a, b) => a + b, 0);
  const totalIva = Object.values(ivaMontos).reduce((a, b) => a + b, 0);
  const total = importeNeto + totalIva;

  return { neto, ivaMontos, importeNeto, totalIva, total };
};

export default function ResumenImpositivo({
  items = [],
  descuentoGlobal = 0,
  className = "",
  compact = false,
}) {
  const { ivaMontos, importeNeto, totalIva, total } = calcularResumenImpositivo(
    items,
    descuentoGlobal,
  );
  const alicuotas = [27, 21, 10.5, 0];

  const padY = compact ? "py-1.5" : "py-2.5";
  const padX = compact ? "px-3" : "px-4";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div
      className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      <table className={`w-full ${textSize}`}>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className={`${padX} ${padY} text-gray-600`}>
              Importe neto gravado
            </td>
            <td
              className={`${padX} ${padY} text-right font-medium text-gray-800`}
            >
              {formatMoney(importeNeto)}
            </td>
          </tr>

          {alicuotas.map((a) => (
            <tr key={a} className="border-b border-gray-100">
              <td
                className={`${padX} ${padY} ${ivaMontos[a] > 0 ? "text-gray-600" : "text-gray-300"}`}
              >
                IVA {a}%
              </td>
              <td
                className={`${padX} ${padY} text-right font-medium ${ivaMontos[a] > 0 ? "text-gray-800" : "text-gray-300"}`}
              >
                {formatMoney(ivaMontos[a])}
              </td>
            </tr>
          ))}

          {totalIva > 0 && (
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className={`${padX} ${padY} text-gray-600 font-medium`}>
                Total IVA
              </td>
              <td
                className={`${padX} ${padY} text-right font-medium text-gray-800`}
              >
                {formatMoney(totalIva)}
              </td>
            </tr>
          )}

          <tr className="bg-blue-50">
            <td
              className={`${padX} ${compact ? "py-2" : "py-3"} font-semibold text-gray-900`}
            >
              Total
            </td>
            <td
              className={`${padX} ${compact ? "py-2" : "py-3"} text-right font-bold text-blue-700 ${compact ? "text-sm" : "text-base"}`}
            >
              {formatMoney(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
