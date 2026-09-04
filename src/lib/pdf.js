import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatIDR } from './currency.js'

function header(doc, title, subtitle) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('MY ECONOMY', 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(title, 14, 23)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(subtitle, 14, 28)
  doc.setTextColor(0)
}

function footer(doc) {
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Halaman ${i} dari ${n}`, 196, 290, { align: 'right' })
  }
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(iso).slice(0, 10)
  }
}

export function exportTransactionsPDF({ list, fileStamp, periodLabel, catName = (id) => id, walletLabel = (id) => id }) {
  const doc = new jsPDF()
  const income = list.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
  const expense = list.filter((t) => t.type !== 'income').reduce((a, t) => a + Number(t.amount || 0), 0)

  header(doc, `Daftar Transaksi - ${periodLabel}`, `Diekspor: ${new Date().toLocaleString('id-ID')} - ${list.length} transaksi`)

  autoTable(doc, {
    startY: 33,
    head: [['Total Masuk', 'Total Keluar', 'Selisih']],
    body: [[formatIDR(income), formatIDR(expense), formatIDR(income - expense)]],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'right' },
    headStyles: { halign: 'center' },
  })

  autoTable(doc, {
    head: [['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Catatan', 'Nominal']],
    body: list.map((t) => [
      fmtDate(t.date),
      t.type === 'income' ? 'Masuk' : 'Keluar',
      catName(t.categoryId),
      walletLabel(t.walletId || t.wallet),
      (t.note || '-').slice(0, 40),
      formatIDR(t.amount),
    ]),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [35, 160, 148] },
    columnStyles: { 5: { halign: 'right' } },
  })

  footer(doc)
  doc.save(`my-economy-${fileStamp}.pdf`)
}

export function exportReportPDF({ month, summary, byCategoryRows, catName = (id) => id }) {
  const doc = new jsPDF()
  header(doc, `Laporan Bulanan - ${month}`, `Diekspor: ${new Date().toLocaleString('id-ID')}`)
  const total = summary.income + summary.expense || 1

  autoTable(doc, {
    startY: 33,
    head: [['Pemasukan', 'Pengeluaran', 'Sisa']],
    body: [[formatIDR(summary.income), formatIDR(summary.expense), formatIDR(summary.balance)]],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'right' },
    headStyles: { halign: 'center' },
  })

  autoTable(doc, {
    head: [['Kategori', 'Total', 'Porsi']],
    body: byCategoryRows.map(([id, value]) => [
      catName(id),
      formatIDR(value),
      `${Math.round((value / total) * 100)}%`,
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [144, 205, 244] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  })

  if (summary.daily?.length) {
    autoTable(doc, {
      head: [['Tanggal', 'Masuk', 'Keluar']],
      body: summary.daily.map((d) => [fmtDate(d.date), formatIDR(d.income), formatIDR(d.expense)]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 144, 232] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
  }

  footer(doc)
  doc.save(`my-economy-laporan-${month}.pdf`)
}
