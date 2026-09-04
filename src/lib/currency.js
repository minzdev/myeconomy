export function formatIDR(n) {
  const v = Number(n || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)
}

export function monthKey(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

// Angka ringkas untuk sumbu grafik: 1 jt, 750 rb, 2,5 M
export function compactIDR(n) {
  const v = Number(n || 0)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  const trim = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',')
  if (abs >= 1e9) return `${sign}${trim(abs / 1e9)} M`
  if (abs >= 1e6) return `${sign}${trim(abs / 1e6)} jt`
  if (abs >= 1e3) return `${sign}${trim(abs / 1e3)} rb`
  return `${sign}${abs}`
}

export function toDateInputValue(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
