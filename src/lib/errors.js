// Mapping error Firestore/Auth teknis -> pesan Indonesia yang jelas
export function friendlyDbError(e) {
  const code = e?.code || ''
  const msg = e?.message || ''
  if (code === 'permission-denied' || /permission|insufficient/i.test(msg)) {
    return 'Akses database ditolak. Buka Firebase Console → Firestore Database → Rules, publish isi firestore.rules dari repo ini, lalu coba lagi.'
  }
  if (code === 'unauthenticated') return 'Sesi berakhir. Keluar lalu masuk lagi.'
  if (code === 'unavailable') return 'Tidak bisa menjangkau database. Periksa koneksi internet.'
  if (code === 'failed-precondition') return 'Database butuh index. Buka link error di console atau Firebase Console → Firestore → Indexes.'
  if (code === 'not-found') return 'Data tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.'
  return msg || 'Gagal menyimpan. Coba lagi.'
}
