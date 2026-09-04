# My Economy — Personal Money Tracker

Web app pencatat keuangan pribadi: pemasukan, pengeluaran, dompet (cash/bank/e-wallet/e-money),
budget per kategori, laporan bulanan + export PDF. Desain Neo-Brutalism, mobile-first.

## Fitur
- Auth email + password (Firebase Authentication), lupa password via email
- Dashboard: saldo, grafik harian, transaksi terakhir, ringkasan per dompet
- Transaksi: tambah/edit/hapus, filter tanggal (hari ini, kemarin, 7 hari, bulan ini, custom range),
  filter tipe/kategori/dompet + pencarian, export PDF
- Dompet: tambah/edit/hapus (cash, bank, e-wallet, e-money) + saldo otomatis
- Budget bulanan per kategori + alert 80%/100%
- Laporan bulanan: pie per kategori, bar harian, export PDF
- Real-time sync per akun via Cloud Firestore

## Tech Stack
| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite 5, React Router 6, TailwindCSS 3, Recharts, jsPDF |
| Backend (opsional) | Node.js + Express + Firebase Admin (`server/`) |
| Auth & Database | Firebase Authentication, Cloud Firestore |
| Hosting | Netlify (frontend), Render/Railway (backend, opsional) |

## Struktur Proyek
```
├── src/
│   ├── components/   # Layout, bottom nav, form transaksi, UI kit brutalist
│   ├── contexts/     # AuthContext
│   ├── lib/          # firebase, transactions, categories, wallets, budgets, pdf
│   └── pages/        # Dashboard, Transactions, Wallets, Budgets, Reports, Settings, Login, Register
├── server/           # REST API Express (agregasi + validasi)
├── firestore.rules   # Security rules (isolasi per uid)
├── netlify.toml      # Build + redirect SPA
└── PRD.md            # Product Requirements Document
```

## Cara Jalan Lokal

**1. Clone & install**
```bash
git clone https://github.com/minzdev/myeconomy.git
cd myeconomy
npm install
```

**2. Setup Firebase**
1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. Aktifkan **Authentication → Email/Password**
3. Buat **Firestore Database** (production mode)
4. Deploy `firestore.rules` (via `firebase deploy --only firestore:rules` atau paste di Rules tab)
5. Di **Authentication → Settings → Authorized domains**, tambah domain Netlify kamu
6. Salin Web config project ke `.env` (contoh di `.env.example`):

```bash
cp .env.example .env
# lalu isi 7 variabel VITE_FIREBASE_* — JANGAN commit file .env
```

**3. Jalankan**
```bash
npm run dev        # frontend http://localhost:5173
```

Backend opsional (frontend full-fungsi tanpa backend):
```bash
cd server
npm install
cp .env.example .env   # isi kredensial Firebase Admin
npm run dev            # http://localhost:5000
```

## Environment Variables
| Variabel | Keterangan |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web API key Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | xxx.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID (opsional, analytics) |
| `VITE_API_URL` | URL backend (opsional) |

> Nilai aslinya hanya di `.env` lokal / Netlify dashboard — tidak ada secret di repo ini.

## Deploy Netlify
1. Import repo GitHub di Netlify
2. Build command: `npm run build`, Publish: `dist`
3. Isi semua `VITE_FIREBASE_*` di **Site settings → Environment variables**
4. Deploy — routing SPA sudah ditangani `netlify.toml`

## Script
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build production ke `dist/` |
| `npm run preview` | Preview hasil build |
