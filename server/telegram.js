// Bot Telegram My Economy: terima pesan -> parse -> catat ke Firestore.
// Alur tautan: user buat kode di web (POST /api/telegram/link-code),
// lalu kirim "/start KODE" ke bot. Mapping chat tersimpan di telegram_chats/{chatId}.
import { parseTransaction, parseAmountToken } from './parse.js'

// ---- Rekap via chat (zona Asia/Jakarta) ----
const ID_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function jktToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function addDaysStr(s, n) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * 864e5).toISOString().slice(0, 10)
}

function fmtDay(s) {
  const [y, m, d] = s.split('-').map(Number)
  return `${d} ${ID_MON[m - 1]} ${y}`
}

function txDayJakarta(iso) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  } catch {
    return String(iso).slice(0, 10)
  }
}

// "pengeluaran hari ini" / "laporan minggu ini" / "pemasukan bulan ini" / "rekap kemarin"
export function resolveReportRange(text) {
  const t = ` ${String(text || '').toLowerCase()} `
  const today = jktToday()
  if (/kemarin/.test(t)) return { key: 'kemarin', start: addDaysStr(today, -1), end: addDaysStr(today, -1) }
  if (/minggu/.test(t)) {
    const [y, m, d] = today.split('-').map(Number)
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // Senin = 0
    return { key: 'minggu', start: addDaysStr(today, -dow), end: today }
  }
  if (/bulan/.test(t)) return { key: 'bulan', start: `${today.slice(0, 7)}-01`, end: today }
  if (/hari ini|hariini|hari-ini/.test(t)) return { key: 'hari', start: today, end: today }
  // kata laporan tanpa rentang eksplisit -> default bulan ini
  if (/(laporan|rekap|ringkasan)/.test(t)) return { key: 'bulan', start: `${today.slice(0, 7)}-01`, end: today }
  return null
}

export function isReportQuery(text) {
  const t = ` ${String(text || '').toLowerCase()} `
  const hasRange = /(hari ini|hariini|kemarin|minggu|bulan|laporan|rekap|ringkasan)/.test(t)
  if (!hasRange) return false
  if (/(laporan|rekap|ringkasan)/.test(t)) return true
  return /(pengeluaran|pemasukan)/.test(t)
}

function hasAmount(text) {
  return String(text || '').split(/\s+/).some((tok) => parseAmountToken(tok) > 0)
}

export function buildReportMessage({ scope, range, list, catName }) {
  const inScope = scope === 'both' ? list : list.filter((t) => t.type === (scope === 'income' ? 'income' : 'expense'))
  const income = inScope.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
  const expense = inScope.filter((t) => t.type !== 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
  const byCat = {}
  for (const t of inScope) {
    const k = t.categoryId || '?'
    if (!byCat[k]) byCat[k] = { total: 0, type: t.type }
    byCat[k].total += Number(t.amount || 0)
  }
  const top = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total).slice(0, 10)

  const rangeLabel = range.start === range.end ? fmtDay(range.start) : `${fmtDay(range.start)} – ${fmtDay(range.end)}`
  const scopeTitle = scope === 'income' ? 'Pemasukan' : scope === 'expense' ? 'Pengeluaran' : 'Laporan'
  const lines = [`📊 <b>${scopeTitle} ${range.key === 'hari' ? 'hari ini' : range.key === 'kemarin' ? 'kemarin' : range.key === 'minggu' ? 'minggu ini' : 'bulan ini'}</b> (${rangeLabel})`]
  if (scope === 'both') {
    lines.push(`Masuk: <b>${idr(income)}</b>`, `Keluar: <b>${idr(expense)}</b>`, `Sisa: <b>${idr(income - expense)}</b>`)
  } else {
    lines.push(`Total: <b>${idr(scope === 'income' ? income : expense)}</b> (${inScope.length} transaksi)`)
  }
  if (top.length) {
    lines.push('', '<b>Top kategori:</b>')
    top.forEach(([id, v], i) => {
      lines.push(`${i + 1}. ${v.type === 'income' ? '🟢' : '🔴'} ${escHtml(catName(id))} — ${idr(v.total)}`)
    })
  } else {
    lines.push('', 'Belum ada transaksi pada rentang ini.')
  }
  return lines.join('\n')
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
export const telegramEnabled = !!BOT_TOKEN

export async function tgSend(chatId, text) {
  if (!BOT_TOKEN) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN kosong, pesan tidak terkirim')
    return
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!r.ok) console.error('[telegram] send gagal:', r.status, await r.text().catch(() => ''))
    else console.log('[telegram] balasan terkirim ke chat', chatId)
  } catch (e) {
    console.error('[telegram] send gagal:', e.message)
  }
}

const WELCOME = [
  '👋 <b>Selamat datang di My Economy!</b>',
  '',
  'Aku bot pencatat keuanganmu. Cukup kirim pesan seperti ini:',
  '<code>keluar 50rb makan bca</code>',
  '<code>makan siang 45.000 gopay</code>',
  '<code>masuk 5jt gaji bca</code>',
  '',
  '📊 Tanya rekap: <code>pengeluaran hari ini</code>, <code>laporan minggu ini</code>',
  '',
  'Perintah: /bantuan /batal',
].join('\n')

const LINKED = [
  '✅ <b>Akun tertaut! Selamat datang di My Economy!</b>',
  '',
  'Kirim transaksi seperti ini:',
  '<code>keluar 50rb makan bca</code>',
  '<code>makan siang 45.000 gopay</code>',
  '<code>masuk 5jt gaji bca</code>',
  '',
  '📊 Tanya rekap: <code>pengeluaran hari ini</code>, <code>laporan minggu ini</code>',
  '',
  'Perintah: /bantuan /batal',
].join('\n')

const HELP = [
  '<b>My Economy Bot</b>',
  '',
  '📝 <b>Catat:</b> <code>keluar 50rb makan bca</code>',
  '',
  '📊 <b>Tanya rekap:</b> <code>pengeluaran hari ini</code>, <code>pemasukan minggu ini</code>, <code>laporan bulan ini</code>',
  '',
  'Perintah: /bantuan /batal (batalkan catat terakhir)',
].join('\n')

function idr(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

// Escape untuk pesan Telegram parse_mode=HTML: nama kategori/dompet dibuat user
// dan diinterpolasi ke pesan, tanpa escape bisa merusak format / menyisipkan link.
function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function getUserData(db, uid) {
  const [cats, wallets] = await Promise.all([
    db.collection('users').doc(uid).collection('categories').get(),
    db.collection('users').doc(uid).collection('wallets').get(),
  ])
  return {
    categories: cats.docs.map((d) => ({ id: d.id, ...d.data() })),
    wallets: wallets.docs.map((d) => ({ id: d.id, ...d.data() })),
  }
}

async function tryLinkWithCode(db, chatId, chatKey, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!/^[0-9A-F]{6}$/.test(code)) return false
  const codeRef = db.collection('telegram_link_codes').doc(code)
  const codeDoc = await codeRef.get()
  if (!codeDoc.exists) {
    await tgSend(chatId, 'Kode tidak dikenal / kadaluarsa. Buat kode baru di web (<b>Pengaturan → Bot Telegram</b>).')
    return true
  }
  const { uid, createdAt } = codeDoc.data()
  const ageMin = (Date.now() - (createdAt?.toMillis?.() || createdAt?.getTime?.() || 0)) / 60000
  if (ageMin > 15) {
    await codeRef.delete().catch(() => {})
    await tgSend(chatId, 'Kode kadaluarsa (15 menit). Buat kode baru di web.')
    return true
  }
  await db.collection('telegram_chats').doc(chatKey).set({ uid, linkedAt: new Date(), chatId: chatKey })
  await codeRef.delete().catch(() => {})
  await tgSend(chatId, LINKED)
  return true
}

export async function handleTelegramUpdate(db, update) {
  const msg = update?.message
  const text = (msg?.text || '').trim()
  const chatId = msg?.chat?.id
  if (!chatId || !text) return
  const chatKey = String(chatId)
  console.log('[telegram] pesan masuk chat', chatKey, ':', text.slice(0, 60))

  if (!db) {
    await tgSend(chatId, 'Backend belum terhubung ke Firestore. Cek env server.')
    return
  }

  // Tautan akun: "/start KODE" maupun KODE saja
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1]?.trim()
    if (!code) {
      await tgSend(chatId, `${WELCOME}\n\n🔗 <b>Tautkan dulu akunmu:</b>\n1. Buka web → <b>Pengaturan → Bot Telegram → Buat kode</b>\n2. Kirim ke sini: <code>/start KODEKAMU</code> atau langsung tempel kodenya`)
      return
    }
    await tryLinkWithCode(db, chatId, chatKey, code)
    return
  }

  const chatDoc = await db.collection('telegram_chats').doc(chatKey).get()
  if (!chatDoc.exists) {
    // Izinkan tempel kode langsung tanpa /start
    if (/^[0-9A-Fa-f]{6}$/.test(text.trim())) {
      await tryLinkWithCode(db, chatId, chatKey, text)
      return
    }
    await tgSend(chatId, 'Akun belum tertaut. Buat kode di web (<b>Pengaturan → Bot Telegram</b>) lalu kirim <code>/start KODE</code> atau langsung tempel kodenya.')
    return
  }
  const { uid } = chatDoc.data()

  if (text.startsWith('/bantuan') || text.startsWith('/help')) {
    await tgSend(chatId, HELP)
    return
  }

  if (text.startsWith('/batal')) {
    const snap = await db
      .collection('users').doc(uid).collection('transactions')
      .orderBy('createdAt', 'desc').limit(10).get()
    const cutoff = Date.now() - 10 * 60 * 1000
    const target = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((t) => t.source === 'telegram' && t.chatId === chatKey && (t.createdAt?.toMillis?.() || 0) > cutoff)
    if (!target) {
      await tgSend(chatId, 'Tidak ada catatan 10 menit terakhir yang bisa dibatalkan.')
      return
    }
    await db.collection('users').doc(uid).collection('transactions').doc(target.id).delete()
    await tgSend(chatId, `↩️ Dibatalkan: ${target.type === 'income' ? 'Masuk' : 'Keluar'} ${idr(target.amount)} (${escHtml(target.categoryId)}).`)
    return
  }

  if (text.startsWith('/')) {
    await tgSend(chatId, HELP)
    return
  }

  // Pesan transaksi / tanya rekap
  let userData
  try {
    userData = await getUserData(db, uid)
  } catch {
    await tgSend(chatId, 'Gagal membaca data (izin database?). Pastikan firestore.rules sudah publish.')
    return
  }

  // Ada nominal = niat mencatat. Tanpa nominal + kata rentang = niat tanya rekap.
  const range = resolveReportRange(text)
  if (range && !hasAmount(text) && isReportQuery(text)) {
    let all = []
    try {
      const snap = await db.collection('users').doc(uid).collection('transactions').get()
      all = snap.docs.map((doc) => doc.data())
    } catch {
      await tgSend(chatId, 'Gagal membaca data (izin database?). Pastikan firestore.rules sudah publish.')
      return
    }
    const list = all.filter((t) => {
      const day = txDayJakarta(t.date)
      return day >= range.start && day <= range.end
    })
    const tl = ` ${text.toLowerCase()} `
    const scope = /pemasukan/.test(tl) && !/pengeluaran/.test(tl) ? 'income' : /pengeluaran/.test(tl) && !/pemasukan/.test(tl) ? 'expense' : 'both'
    const catName = (id) => userData.categories.find((c) => c.id === id)?.name || id
    await tgSend(chatId, buildReportMessage({ scope, range, list, catName }))
    return
  }

  const parsed = parseTransaction(text, userData)
  if (!parsed.ok) {
    await tgSend(chatId, `❌ ${parsed.error}`)
    return
  }
  const d = parsed.data
  try {
    await db.collection('users').doc(uid).collection('transactions').add({
      amount: d.amount,
      type: d.type,
      categoryId: d.categoryId,
      walletId: d.walletId,
      date: new Date().toISOString(),
      note: d.note,
      uid,
      source: 'telegram',
      chatId: chatKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await tgSend(
      chatId,
      `✅ Tercatat: <b>${d.type === 'income' ? 'Masuk' : 'Keluar'} ${idr(d.amount)}</b>\n${escHtml(d.categoryName)} • ${escHtml(d.walletName)}\n<i>Ketik /batal untuk membatalkan (10 menit).</i>`,
    )
  } catch {
    await tgSend(chatId, 'Gagal menyimpan (izin database?). Pastikan firestore.rules sudah publish.')
  }
}
