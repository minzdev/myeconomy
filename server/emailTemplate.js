// Template email HTML untuk reset password & transaksi umum.
// Email client hanya mendukung CSS inline + table layout, jadi ditulis manual begitu.
// Style mengikuti desain Neo Brutalism app (kuning #FFDC58, border hitam, hard shadow).

const BRAND = {
  name: 'My Economy',
  yellow: '#FFDC58',
  green: '#23A094',
  cream: '#FFFBEB',
  black: '#111111',
  gray: '#6b7280',
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function passwordResetEmail({ email, resetUrl, appName = BRAND.name }) {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Reset Password ${esc(appName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <!-- Preheader: teks preview di inbox -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Klik tombol di bawah untuk membuat password baru akun ${esc(email)}. Link berlaku 1 jam.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Kartu utama -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td style="background-color:#ffffff;border:3px solid ${BRAND.black};border-radius:16px;box-shadow:6px 6px 0 ${BRAND.black};padding:36px 32px;">

              <!-- Logo / wordmark -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <span style="display:inline-block;background-color:${BRAND.yellow};border:2px solid ${BRAND.black};border-radius:10px;padding:8px 16px;font-size:18px;font-weight:800;letter-spacing:-0.5px;color:${BRAND.black};">
                      💰 ${esc(appName)}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.black};">
                Reset Password
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${BRAND.gray};">
                Hai, kami menerima permintaan reset password untuk akun
                <strong style="color:${BRAND.black};">${esc(email)}</strong>.
                Klik tombol di bawah untuk membuat password baru.
              </p>

              <!-- Tombol -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 12px;">
                    <a href="${esc(resetUrl)}"
                       style="display:block;background-color:${BRAND.green};border:2px solid ${BRAND.black};border-radius:12px;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;box-shadow:4px 4px 0 ${BRAND.black};">
                      Reset Password Sekarang
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link (kalau tombol tidak bisa diklik) -->
              <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.gray};word-break:break-all;">
                Tombol tidak jalan? Salin link ini ke browser:<br />
                <a href="${esc(resetUrl)}" style="color:${BRAND.green};font-weight:600;">${esc(resetUrl)}</a>
              </p>

            </td>
          </tr>

          <!-- Catatan keamanan -->
          <tr>
            <td style="padding-top:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.yellow};border:2px solid ${BRAND.black};border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;line-height:1.6;color:${BRAND.black};">
                    🔒 <strong>Catatan keamanan:</strong> link ini hanya berlaku <strong>1 jam</strong> dan hanya bisa dipakai sekali.
                    Kalau kamu tidak meminta reset password, abaikan email ini — passwordmu tetap aman.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;font-size:11px;line-height:1.6;color:${BRAND.gray};">
              Email otomatis dari ${esc(appName)} — jangan balas email ini.<br />
              © ${year} ${esc(appName)}. Semua hak dilindungi.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

export function passwordResetText({ email, resetUrl, appName = BRAND.name }) {
  return [
    `Hai,`,
    ``,
    `Kami menerima permintaan reset password akun ${email} di ${appName}.`,
    `Buka link berikut untuk membuat password baru (berlaku 1 jam):`,
    resetUrl,
    ``,
    `Kalau kamu tidak meminta reset ini, abaikan email ini — passwordmu tetap aman.`,
    ``,
    `Salam,`,
    `Tim ${appName}`,
  ].join('\n')
}

// Tulis ulang link reset bawaan Firebase (…/__/auth/action?mode=resetPassword&oobCode=…)
// menjadi halaman custom milik kita (mis. https://appkamu.com/reset-password).
// Hanya oobCode yang dibawa (cukup untuk verifyPasswordResetCode/confirmPasswordReset).
// Kalau handlerBase kosong / bukan link reset / tanpa oobCode -> kembalikan URL asli.
export function toCustomResetUrl(resetUrl, handlerBase) {
  if (!handlerBase) return resetUrl
  try {
    const u = new URL(resetUrl)
    if (u.searchParams.get('mode') !== 'resetPassword') return resetUrl
    const oobCode = u.searchParams.get('oobCode')
    if (!oobCode) return resetUrl
    return `${String(handlerBase).replace(/\/$/, '')}?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`
  } catch {
    return resetUrl
  }
}
