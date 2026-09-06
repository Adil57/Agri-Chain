// src/lib/invoice.js — generate a real downloadable GST invoice PDF
import { jsPDF } from 'jspdf'

const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`

export function downloadInvoice(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const green = [22, 36, 10]
  const amber = [217, 154, 34]

  // header band
  doc.setFillColor(...green)
  doc.rect(0, 0, W, 90, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24)
  doc.text('AgriChain', 40, 45)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.setTextColor(...amber)
  doc.text('Farm-to-Market  |  GST Tax Invoice', 40, 65)

  const invId = `AGC-${String(order.id).padStart(6, '0')}`
  doc.setTextColor(255, 255, 255); doc.setFontSize(10)
  doc.text(`Invoice: ${invId}`, W - 40, 45, { align: 'right' })
  doc.text(new Date(order.created_at || Date.now()).toLocaleDateString('en-IN'), W - 40, 62, { align: 'right' })

  // parties
  let y = 130
  doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('Seller (Farmer)', 40, y)
  doc.text('Buyer', W / 2 + 20, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(70, 70, 70)
  doc.text(String(order.seller || '—'), 40, y + 18, { maxWidth: W / 2 - 60 })
  doc.text(String(order.buyer_name || order.buyer_type || '—'), W / 2 + 20, y + 18)
  if (order.buyer_email) doc.text(String(order.buyer_email), W / 2 + 20, y + 33)

  // table header
  y += 70
  doc.setFillColor(245, 242, 233); doc.rect(40, y, W - 80, 26, 'F')
  doc.setTextColor(...green); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('Item', 50, y + 17)
  doc.text('Qty', W - 250, y + 17)
  doc.text('Rate', W - 170, y + 17)
  doc.text('Amount', W - 90, y + 17)

  // row
  y += 44
  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
  doc.text(String(order.crop || 'Produce'), 50, y)
  doc.text(`${order.qty} ${order.unit || ''}`.trim(), W - 250, y)
  doc.text(inr(Number(order.amount) / Number(order.qty || 1)), W - 170, y)
  doc.text(inr(order.amount), W - 90, y)

  // totals
  y += 30; doc.setDrawColor(220); doc.line(W - 260, y, W - 40, y)
  y += 22
  const line = (label, val, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 12 : 10)
    doc.setTextColor(bold ? green[0] : 90, bold ? green[1] : 90, bold ? green[2] : 90)
    doc.text(label, W - 200, y)
    doc.text(val, W - 40, y, { align: 'right' })
    y += bold ? 24 : 18
  }
  const gst = Number(order.gst || Math.round(Number(order.amount) * 0.05))
  line('Subtotal', inr(order.amount))
  line('GST (5%)', inr(gst))
  line('Total', inr(Number(order.amount) + gst), true)

  // status + footer
  y += 10
  doc.setFillColor(236, 253, 245); doc.rect(40, y, W - 80, 28, 'F')
  doc.setTextColor(6, 95, 70); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(`Payment Status: ${order.status || 'In Escrow'}`, 50, y + 18)

  doc.setTextColor(150); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text('This is a computer-generated invoice from AgriChain. Escrow-protected transaction.', 40, 800)

  doc.save(`${invId}.pdf`)
}
