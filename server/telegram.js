// Bot Telegram My Economy: terima pesan -> parse -> catat ke Firestore.
// Alur tautan: user buat kode di web (POST /api/telegram/link-code),
// lalu kirim "/start KODE" ke bot. Mapping chat tersimpan di telegram_chats/{chatId}.
import { parseTransaction } from './parse.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
export const telegramEnabled = !!BOT_TOKEN

export async function tgSend(chatId, text) {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('[telegram] send gagal:', e.message)
  }
}

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

export async function handleTelegramUpdate(db, update) {
  const msg = update?.message
  const text = (msg?.text || '').trim()
  const chatId = msg?.chat?.id
  if (!chatId || !text) return
  const chatKey = String(chatId)

  if (!db) {
    await tgSend(chatId, 'Backend belum terhubung ke Firestore. Cek env server.')
    return
  }

  // Perintah tanpa perlu tautan
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1]?.trim().toUpperCase()
    if (!code) {
      await tgSend(chatId, 'Buat kode dulu di web: <b>Pengaturan → Bot Telegram → Buat kode</b>, lalu kirim:\n<code>/start KODEKAMU</code>')
      return
    }
    const codeRef = db.collection('telegram_link_codes').doc(code)
    const codeDoc = await codeRef.get()
    if (!codeDoc.exists) {
      await tgSend(chatId, 'Kode tidak dikenal / kadaluarsa. Buat kode baru di web.')
      return
    }
    const { uid, createdAt } = codeDoc.data()
    const ageMin = (Date.now() - (createdAt?.toMillis?.() || 0)) / 60000
    if (ageMin > 15) {
      await codeRef.delete().catch(() => {})
      await tgSend(chatId, 'Kode kadaluarsa (15 menit). Buat kode baru di web.')
      return
    }
    await db.collection('telegram_chats').doc(chatKey).set({ uid, linkedAt: new Date(), chatId: chatKey })
    await codeRef.delete().catch(() => {})
    await tgSend(chatId, '✅ Akun tertaut! Kirim transaksi, contoh:\n<code>keluar 50rb makan bca</code>\n\nKetik /bantuan untuk format lengkap.')
    return
  }

  const chatDoc = await db.collection('telegram_chats').doc(chatKey).get()
  if (!chatDoc.exists) {
    await tgSend(chatId, 'Akun belum tertaut. Buat kode di web (<b>Pengaturan → Bot Telegram</b>) lalu kirim <code>/start KODE</code>.')
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
