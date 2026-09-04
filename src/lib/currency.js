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

export function toDateInputValue(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toISOString().slice(0, 10)
}
