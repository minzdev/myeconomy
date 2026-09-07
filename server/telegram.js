// Bot Telegram My Economy: terima pesan -> parse -> catat ke Firestore.
// Alur tautan: user buat kode di web (POST /api/telegram/link-code),
// lalu kirim "/start KODE" ke bot. Mapping chat tersimpan di telegram_chats/{chatId}.
import { parseTransaction } from './parse.js'

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
  'Perintah: /bantuan /batal',
].join('\n')

const HELP = [
  '<b>My Economy Bot</b>',
  '',
  'Kirim transaksi bebas, contoh:',
  '<code>keluar 50rb makan bca</code>',
  '<code>makan siang 45.000 gopay</code>',
  '<code>masuk 5jt gaji bca</code>',
  '',
  'Perintah: /bantuan /batal (batalkan catat terakhir)',
].join('\n')

function idr(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
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
    await tgSend(chatId, `↩️ Dibatalkan: ${target.type === 'income' ? 'Masuk' : 'Keluar'} ${idr(target.amount)} (${target.categoryId}).`)
    return
  }

  if (text.startsWith('/')) {
    await tgSend(chatId, HELP)
    return
  }

  // Pesan transaksi
  let userData
  try {
    userData = await getUserData(db, uid)
  } catch {
    await tgSend(chatId, 'Gagal membaca data (izin database?). Pastikan firestore.rules sudah publish.')
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
      `✅ Tercatat: <b>${d.type === 'income' ? 'Masuk' : 'Keluar'} ${idr(d.amount)}</b>\n${d.categoryName} • ${d.walletName}\n<i>Ketik /batal untuk membatalkan (10 menit).</i>`,
    )
  } catch {
    await tgSend(chatId, 'Gagal menyimpan (izin database?). Pastikan firestore.rules sudah publish.')
  }
}
