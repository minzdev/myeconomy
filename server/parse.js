// Parser pesan chat -> data transaksi. Murni (tanpa dependency), dipakai webhook Telegram/WA.
// Format: "[masuk|keluar] <nominal> [kata kategori] [kata dompet]"
// Contoh: "keluar 50rb makan bca" / "makan siang 45.000 gopay" / "masuk 5jt gaji bca"

const norm = (s) => String(s || '').toLowerCase()

export function parseAmountToken(token) {
  const m = String(token || '').match(/^(\d[\d.,]*)(rb|ribu|k|jt|juta|m)?$/i)
  if (!m) return 0
  let num = m[1].replace(/\./g, '')
  if (num.includes(',')) {
    const [a, b = ''] = num.split(',')
    num = b.length > 0 && b.length <= 2 ? `${a}.${b}` : num.replace(/,/g, '')
  }
  let val = parseFloat(num)
  if (!Number.isFinite(val) || val <= 0) return 0
  const sfx = (m[2] || '').toLowerCase()
  if (['rb', 'ribu', 'k'].includes(sfx)) val *= 1000
  else if (['jt', 'juta'].includes(sfx)) val *= 1000000
  else if (sfx === 'm') val *= 1000000000
  return Math.round(val)
}

export function detectType(text) {
  const t = ` ${norm(text)} `
  if (/(masuk|pemasukan|gaji|dapat|diterima|terima|bonus)/.test(t)) return 'income'
  return 'expense'
}

function matchByName(items, text) {
  const t = norm(text)
  // cocok persis dulu, lalu substring
  for (const it of items) {
    const n = norm(it.name)
    if (n && t.split(/\s+/).includes(n)) return it
  }
  const scored = items
    .map((it) => ({ it, n: norm(it.name) }))
    .filter(({ n }) => n && (t.includes(n) || n.split(/\s+/).some((w) => w.length > 2 && t.includes(w))))
    .sort((a, b) => b.n.length - a.n.length)
  return scored[0]?.it || null
}

export function parseTransaction(text, { categories = [], wallets = [] } = {}) {
  const raw = String(text || '').trim()
  if (!raw) return { ok: false, error: 'Pesan kosong.' }

  const type = detectType(raw)
  const tokens = raw.split(/\s+/)

  let amount = 0
  for (const tok of tokens) {
    const v = parseAmountToken(tok)
    if (v > 0) {
      amount = v
      break
    }
  }
  if (!amount) {
    return {
      ok: false,
      error: 'Nominal tidak ketemu. Contoh: "keluar 50rb makan bca" atau "makan 45.000 gopay".',
    }
  }

  const pool = categories.filter((c) => c.type === type || c.type === 'both')
  let category = matchByName(pool, raw)
  if (!category) {
    category =
      pool.find((c) => /lain|other/.test(norm(c.name))) ||
      categories.find((c) => /lain|other/.test(norm(c.name))) ||
      null
  }
  if (!category) {
    return {
      ok: false,
      error: `Kategori tidak dikenali dan belum ada kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'}. Buat dulu di menu Pengaturan.`,
    }
  }

  let wallet = matchByName(wallets, raw) || wallets[0] || null
  if (!wallet) {
    return { ok: false, error: 'Belum ada dompet. Buat dulu di menu Dompet.' }
  }

  return {
    ok: true,
    data: {
      type,
      amount,
      categoryId: category.id,
      categoryName: category.name,
      walletId: wallet.id,
      walletName: wallet.name,
      note: raw.slice(0, 120),
    },
  }
}
