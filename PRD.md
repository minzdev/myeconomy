# PRD: My Economy - Personal Money Tracker Web App

**Nama Produk:** My Economy
**Versi:** 1.0 MVP
**Tanggal:** 4 Sep 2026
**Repo:** D:\ProjectWeb\rekapinaja

## 1. Ringkasan Eksekutif
My Economy adalah web app untuk tracking pemasukan & pengeluaran personal. Target single-user dengan multi-device sync. Fokus: cepat catat, visual jelas, budget terkontrol.

**Tujuan:**
- Catat transaksi <10 detik
- Dashboard cashflow real-time
- Laporan bulanan + budget alert
- Data aman & tersync cloud

## 2. Target Pengguna
Persona utama: Individu 18-35 th, mahasiswa / karyawan, butuh kontrol keuangan harian tanpa fitur akuntansi kompleks.

Kebutuhan utama:
- Tahu uang habis kemana tiap bulan
- Batasi pengeluaran per kategori
- Akses cepat dari HP dan laptop

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18+ (Vite), React Router, TailwindCSS 3.x |
| Backend | Node.js 20 + Express (REST API, validasi, agregasi laporan) |
| Auth | Firebase Authentication (Email/Password + Google OAuth) |
| Database | Cloud Firestore (NoSQL, real-time sync) |
| Hosting | Netlify (Frontend static + redirect proxy API) |
| Charts | Recharts / Chart.js |
| State / Data | React Query + Context / Zustand |

**Arsitektur:**
```
React (Netlify) <-> Node.js API (Express) <-> Firebase Admin SDK <-> Firestore / Auth
```

Alasan Node.js tetap dipakai:
- Lapisan validasi dan otorisasi terpusat
- Agregasi laporan berat tidak membebani client
- Export CSV/PDF
- Menyembunyikan Firebase config dan membatasi akses direct dari client

## 4. Scope Fitur

### MVP (P0 - Wajib)
1. **Auth:** Register/Login/Logout, Google Login, Reset Password, Protected Route
2. **Dashboard:** Saldo total, Pemasukan/Pengeluaran bulan ini, grafik cashflow 30 hari, 5 transaksi terakhir, budget progress bar
3. **Transaksi CRUD:** Tambah/edit/hapus, field: amount, type (income/expense), category, date, note, payment_method (cash/e-wallet/bank)
4. **Kategori:** Default (Makan, Transport, Belanja, Gaji, dll) + custom kategori + icon + warna
5. **Filter & Search:** By tanggal, kategori, tipe, keyword
6. **Budget Bulanan:** Set limit per kategori, alert 80%/100%
7. **Laporan:** Ringkasan bulanan, pie chart per kategori, bar chart income vs expense

### Phase 2 (P1)
- Dompet multi-wallet (Cash, BCA, GoPay, dll) + transfer antar dompet
- Target tabungan / Saving Goals
- Export CSV/PDF
- Dark mode, recurring transaction, reminder
- PWA installable

Out of Scope MVP: Multi-user/share, integrasi bank otomatis (mutasi), mobile native.

## 5. Functional Requirements + Acceptance Criteria

- FR-01: User bisa daftar <2 mnt, session persist setelah refresh.
- FR-02: Tambah transaksi validasi: amount >0 required, kategori required.
- FR-03: Semua data terisolasi per `uid`. Security Rules: `request.auth.uid == userId`.
- FR-04: Dashboard load <2s dengan 1000 transaksi (pakai pagination + agregasi server).
- FR-05: Hapus transaksi butuh konfirmasi modal.
- FR-06: Budget bar berubah warna: hitam -> kuning (80%) -> merah (100%).
- FR-07: Filter bulan default = bulan berjalan, bisa ganti bulan.
- FR-08: Responsive mobile-first, bottom nav di mobile.

### User Stories
- Sebagai user, saya bisa login dengan Google agar cepat masuk.
- Sebagai user, saya bisa tambah pengeluaran dalam 10 detik.
- Sebagai user, saya bisa lihat sisa budget Makan bulan ini.
- Sebagai user, saya bisa lihat grafik pengeluaran per kategori.
- Sebagai user, saya bisa cari transaksi "kopi" bulan lalu.

## 6. Data Model Firestore

```
/users/{uid}
  - email: string
  - displayName: string
  - photoURL: string
  - createdAt: timestamp

  /transactions/{trxId}
    - amount: number
    - type: "income" | "expense"
    - categoryId: string
    - date: timestamp
    - note: string
    - wallet: string (cash | ewallet | bank)
    - uid: string
    - createdAt: timestamp
    - updatedAt: timestamp

  /categories/{catId}
    - name: string
    - icon: string
    - color: string
    - type: "income" | "expense" | "both"
    - isDefault: boolean
    - uid: string

  /budgets/{budgetId}
    - categoryId: string
    - month: string // "2026-09"
    - limit: number
    - uid: string
```

Index composite yang dibutuhkan:
- transactions: `uid ASC + date DESC`
- transactions: `uid ASC + month ASC + categoryId ASC`
- budgets: `uid ASC + month ASC`

Security Rules prinsip:
- Hanya owner (`request.auth.uid == resource.data.uid`) yang bisa read/write.
- Validasi amount > 0 di rules + backend double-check.

## 7. UI/UX - Neo Brutalism

Prinsip desain Neo Brutalism untuk My Economy:
- Border tebal: `border-2 / border-4 border-black`
- Hard shadow tanpa blur: `shadow-[4px_4px_0px_#000]`
- Warna flat high-contrast:
  - Kuning `#FFDC58`
  - Pink `#FF90E8`
  - Hijau `#23A094`
  - Biru `#90CDF4`
  - Background cream `#FFFBEB / #FFFDF5`
  - Hitam `#000000` untuk border/teks
- Font: `Archivo Black / Lexend Mega` untuk heading, `Space Grotesk` untuk body
- Button: `border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all`
- Card: `bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_#000]`
- Layout: Dashboard grid bento, sidebar kiri desktop -> bottom nav mobile

Halaman / Rute:
- `/login` - Login
- `/register` - Register
- `/` - Dashboard
- `/transactions` - List + filter + search
- `/add` - Tambah / Edit transaksi (atau modal)
- `/budgets` - Kelola budget
- `/reports` - Laporan bulanan
- `/settings` - Profil, kategori, wallet

Komponen kunci:
- `BrutalButton`, `BrutalCard`, `BrutalInput`, `BrutalModal`
- `BalanceCard`, `CashflowChart`, `CategoryPie`, `BudgetBar`, `TransactionItem`
- `Navbar` + `BottomNav`, `EmptyState`

## 8. API Design (Node.js + Express)

Base URL: `/api`

```
POST /api/auth/verify
  -> verify Firebase ID token, return user profile

GET /api/transactions?month=2026-09&type=expense&category=xxx&q=kopi&page=1&limit=20
POST /api/transactions
  body: { amount, type, categoryId, date, note, wallet }
PUT /api/transactions/:id
DELETE /api/transactions/:id

GET /api/summary/monthly?month=2026-09
  response: { income, expense, balance, byCategory[], daily[] }

GET /api/budgets?month=2026-09
POST /api/budgets
PUT /api/budgets/:id

GET /api/categories
POST /api/categories
```

Auth: semua request butuh header `Authorization: Bearer <Firebase ID Token>`.

## 9. Non-Functional Requirements

- Performance: Lighthouse >90, TTI <3s di 4G, dashboard <2s untuk 1000 docs
- Security: Firebase Rules + validasi backend, XSS sanitizing, HTTPS only, tidak simpan secret di frontend
- Responsif: Mobile-first 360px -> Desktop 1280px
- Availability: Mengandalkan SLA Firebase + Netlify (99.9%)
- Backup: Export manual CSV di MVP, auto backup Phase 2
- Accessibility: Kontras warna AA, focus state jelas, semantic HTML

## 10. Deployment Netlify

Frontend:
- Build: `npm run build` -> `dist/` di Netlify
- Env: `VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_API_URL`
- CI/CD: push `main` -> auto deploy production, PR -> deploy preview

Backend opsi:
- Opsi A (disarankan MVP): Node.js Express di Render/Railway, frontend proxy via `netlify.toml` redirects
- Opsi B: Port ke Netlify Functions (`netlify/functions/api.js`) agar satu deploy

Contoh `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://api-rekapinaja.onrender.com/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Langkah deploy:
1. Setup project Vite + push ke GitHub
2. Connect repo di Netlify, set build command + env
3. Deploy backend Node.js terpisah, isi URL ke Netlify redirect
4. Setup custom domain (opsional) + HTTPS auto
5. Test auth redirect dan Firestore rules di production

## 11. Milestone (4 Minggu)

- W1: Setup Vite + Tailwind + Firebase Auth + UI Kit Brutalist (Button, Card, Input)
- W2: CRUD Transaksi + Firestore + Filter/Search + Kategori
- W3: Dashboard + Charts + Budget + Summary API
- W4: Reports + Polish responsive + Deploy Netlify + UAT + Bugfix

Definisi Done MVP: semua P0 jalan di production Netlify, tanpa error console, Lighthouse >85.

## 12. Risiko & Mitigasi

- Firestore read bengkak -> agregasi di Node.js + cache React Query, pagination
- Cold start backend gratisan lambat -> pakai Netlify Functions atau warm-up cron
- UX Brutalism terlalu ramai -> batasi palet 4 warna + 1 font heading, testing ke 5 user
- Auth redirect gagal di Netlify -> whitelist domain di Firebase Console

## 13. KPI Sukses

- 80% transaksi tercatat <10 detik (diukur via usability test)
- Retention D7 >40%
- 0 bug auth / data bocor antar user
- Dashboard load <2s

## 14. Open Questions

- [ ] Backend full Express terpisah atau Netlify Functions saja?
- [ ] Butuh multi-wallet di MVP atau Phase 2?
- [ ] Export PDF/CSV masuk MVP?
- [ ] Nama domain production apa? (rekapinaja.netlify.app / custom)
