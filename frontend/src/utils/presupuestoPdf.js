import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { calcularResumenImpositivo } from '@/components/shared/ResumenImpositivo'

const formatMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n || 0)

const formatFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'

export const generarPdfPresupuesto = async (presupuesto, descargar = false) => {
  // Si solo tenemos los datos básicos de la tabla, cargar el completo
  const p = presupuesto

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margen = 15
  const ancho = doc.internal.pageSize.getWidth() - margen * 2

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(26, 31, 46) // color sidebar
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Marcos Miranda', margen, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de gestión', margen, 18)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`PRESUPUESTO #${p.numero}`, doc.internal.pageSize.getWidth() - margen, 12, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(formatFecha(p.fechaComprobante || p.createdAt), doc.internal.pageSize.getWidth() - margen, 18, { align: 'right' })

  // ── Datos del presupuesto ─────────────────────────────────
  doc.setTextColor(40, 40, 40)
  let y = 36

  doc.setFillColor(245, 247, 250)
  doc.rect(margen, y, ancho, 28, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('CLIENTE', margen + 3, y + 6)
  doc.text('REPRESENTACIÓN', margen + ancho / 3 + 3, y + 6)
  doc.text('VENDEDOR', margen + (ancho / 3) * 2 + 3, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(p.cliente?.fantasia || p.cliente?.razonSocial || '—', margen + 3, y + 13)
  doc.text(p.cliente?.razonSocial || '', margen + 3, y + 18)
  doc.text(p.cliente?.cuit ? `CUIT: ${p.cliente.cuit}` : '', margen + 3, y + 23)

  doc.text(p.representacion?.fantasia || p.representacion?.nombre || '—', margen + ancho / 3 + 3, y + 13)
  doc.text(p.vendedor?.nombre || '—', margen + (ancho / 3) * 2 + 3, y + 13)

  y += 34

  // Info del presupuesto
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const infoItems = [
    { label: 'Tipo:', value: p.tipoComprobante === 'factura' ? 'Factura' : 'Comprobante' },
    { label: 'Estado:', value: p.estado?.replace('_', ' ') || '—' },
    { label: 'Validez:', value: p.validezDias ? `${p.validezDias} días` : '—' },
    { label: 'Vencimiento:', value: formatFecha(p.fechaVencimiento) },
  ]

  infoItems.forEach((item, i) => {
    const x = margen + (i % 2) * (ancho / 2)
    const yOffset = y + Math.floor(i / 2) * 6
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, x, yOffset)
    doc.setFont('helvetica', 'normal')
    doc.text(item.value, x + 18, yOffset)
  })

  y += 16

  // ── Tabla de productos ────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text('DETALLE DE PRODUCTOS', margen, y)
  y += 4

  const columnStyles = {
    0: { cellWidth: 8 },
    1: { cellWidth: 'auto' },
    2: { cellWidth: 18, halign: 'center' },
    3: { cellWidth: 25, halign: 'right' },
    4: { cellWidth: 15, halign: 'center' },
    5: { cellWidth: 28, halign: 'right' },
  }

  autoTable(doc, {
  startY: y,
  margin: { left: margen, right: margen },
  head: [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Desc%', 'Subtotal']],
  body: (p.items || []).map((item, i) => {
    const subtotal = Number(item.precioUnitario) * Number(item.cantidad) * (1 - (Number(item.descuento) || 0) / 100)
    return [
      i + 1,
      [item.descripcion, item.codigo ? `Cód: ${item.codigo}` : ''].filter(Boolean).join('\n'),
      item.cantidad,
      formatMoney(item.precioUnitario),
      item.descuento ? `${item.descuento}%` : '—',
      formatMoney(subtotal),
    ]
  }),
  headStyles: { fillColor: [26, 31, 46], textColor: 255, fontSize: 8, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
  alternateRowStyles: { fillColor: [248, 249, 251] },
  styles: { cellPadding: 2.5 },
  columnStyles: {
    0: { cellWidth: 8 },
    2: { cellWidth: 16, halign: 'center' },
    3: { cellWidth: 26, halign: 'right' },
    4: { cellWidth: 14, halign: 'center' },
    5: { cellWidth: 28, halign: 'right' },
  },
})

y = doc.lastAutoTable.finalY + 8

  y = doc.lastAutoTable.finalY + 8

  // ── Resumen impositivo ────────────────────────────────────
  const { ivaMontos, importeNeto, totalIva, total } = calcularResumenImpositivo(p.items || [], p.descuentoGlobal || 0)
  const alicuotas = [27, 21, 10.5, 0]

  const resumenX = margen + ancho * 0.55
  const resumenAncho = ancho * 0.45

  doc.setFillColor(245, 247, 250)
  doc.rect(resumenX, y, resumenAncho, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 31, 46)
  doc.text('RESUMEN IMPOSITIVO', resumenX + 3, y + 4)
  y += 8

  const filaResumen = (label, valor, negrita = false, bgColor = null) => {
    if (bgColor) {
      doc.setFillColor(...bgColor)
      doc.rect(resumenX, y - 4, resumenAncho, 7, 'F')
    }
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setTextColor(negrita ? 26 : 80, negrita ? 31 : 80, negrita ? 46 : 80)
    doc.text(label, resumenX + 3, y)
    doc.text(valor, resumenX + resumenAncho - 3, y, { align: 'right' })
    y += 6
  }

  filaResumen('Importe neto gravado', formatMoney(importeNeto))
  alicuotas.forEach((a) => {
    filaResumen(
      `IVA ${a}%`,
      formatMoney(ivaMontos[a]),
      false,
      ivaMontos[a] > 0 ? null : null
    )
  })
  if (totalIva > 0) filaResumen('Total IVA', formatMoney(totalIva), true)
  if (p.descuentoGlobal > 0) filaResumen(`Descuento global (${p.descuentoGlobal}%)`, `- ${formatMoney(total * p.descuentoGlobal / 100)}`)
  filaResumen('TOTAL', formatMoney(total), true, [26, 31, 46])

  // Color blanco para el total
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  const totalY = y - 6
  doc.text('TOTAL', resumenX + 3, totalY)
  doc.text(formatMoney(total), resumenX + resumenAncho - 3, totalY, { align: 'right' })

  // ── Observaciones ─────────────────────────────────────────
  if (p.observaciones) {
    const obsY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 10
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Observaciones:', margen, Math.max(obsY, totalY + 10))
    doc.setFont('helvetica', 'normal')
    doc.text(p.observaciones, margen + 25, Math.max(obsY, totalY + 10))
  }

  // ── Footer ────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFillColor(245, 247, 250)
  doc.rect(0, pageHeight - 12, doc.internal.pageSize.getWidth(), 12, 'F')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.text('Marcos Miranda — Sistema de gestión', margen, pageHeight - 5)
  doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, doc.internal.pageSize.getWidth() - margen, pageHeight - 5, { align: 'right' })

  if (descargar) {
    doc.save(`presupuesto-${p.numero}.pdf`)
  } else {
    // Abrir en nueva pestaña para previsualizar
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}