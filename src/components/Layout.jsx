import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

function Icon({ d, children, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  )
}

const HomeIcon = () => (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </Icon>
)
const TxIcon = () => (
  <Icon>
    <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
    <path d="M9 7h6M9 11h6" />
  </Icon>
)
const WalletIcon = () => (
  <Icon>
    <path d="M3 7a2 2 0 0 1 2-2h13v3" />
    <path d="M3 7v10a2 2 0 0 0 2 2h16V7H5" />
    <path d="M21 7v12H5" />
    <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" />
  </Icon>
)
const BudgetIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Icon>
)
const ReportIcon = () => (
  <Icon>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
)
const GearIcon = () => (
  <Icon size={20}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
  </Icon>
)

// Bottom nav: maksimal 5, icon-only
const bottomTabs = [
  { to: '/', label: 'Dashboard', Icon: HomeIcon },
  { to: '/transactions', label: 'Transaksi', Icon: TxIcon },
  { to: '/wallets', label: 'Dompet', Icon: WalletIcon },
  { to: '/budgets', label: 'Budget', Icon: BudgetIcon },
  { to: '/reports', label: 'Laporan', Icon: ReportIcon },
]

const desktopLinks = [...bottomTabs, { to: '/settings', label: 'Setting', Icon: GearIcon }]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  const handleLogout = async () => {
    await logout()
    nav('/login')
  }

  const isActive = (to) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to))

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-black bg-brutal-yellow sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <Link to="/" title="My Economy" aria-label="My Economy - beranda" className="flex items-center gap-2 shrink-0">
            <span aria-hidden="true" className="inline-flex items-center justify-center font-display text-sm w-9 h-9 rounded-xl bg-black text-brutal-yellow border-2 border-black shadow-brutal">
              ME
            </span>
            <span className="font-display text-lg tracking-tight hidden min-[400px]:inline">My Economy</span>
          </Link>
          <nav className="hidden md:flex gap-2 text-sm font-bold" aria-label="Navigasi utama">
            {desktopLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`btn-brutal rounded-lg ${isActive(l.to) ? 'bg-black text-white' : 'bg-white'}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold hidden lg:inline max-w-[180px] truncate">{user?.email}</span>
            <Link
              to="/settings"
              title="Pengaturan"
              aria-label="Pengaturan"
              className={`btn-brutal rounded-lg !px-2.5 md:hidden ${isActive('/settings') ? 'bg-black text-white' : 'bg-white'}`}
            >
              <GearIcon />
            </Link>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="btn-brutal bg-white rounded-lg text-sm !px-3 min-h-[40px]"
            >
              <span className="hidden sm:inline">Keluar</span>
              <span className="sm:hidden" aria-hidden="true">⏻</span>
              <span className="sr-only">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 md:pb-10">{children}</main>

      {/* Bottom nav mobile: floating dock, 5 tab icon + label mikro */}
      <nav aria-label="Navigasi bawah" className="md:hidden fixed bottom-0 inset-x-0 z-20 pointer-events-none">
        <div
          className="pointer-events-auto max-w-md mx-3 sm:mx-auto border-[3px] border-black rounded-2xl bg-white/95 backdrop-blur shadow-brutal-lg"
          style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <div className="grid grid-cols-5 gap-0.5 p-1.5" role="tablist">
            {bottomTabs.map(({ to, label, Icon: Ic }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-0 rounded-xl transition-transform duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <span
                    className={`flex items-center justify-center h-8 px-4 rounded-full border-2 transition-all duration-200 ${
                      active
                        ? 'bg-black text-brutal-yellow border-black tab-pop'
                        : 'bg-transparent text-black border-transparent'
                    }`}
                  >
                    <Ic />
                  </span>
                  <span className={`text-[10px] leading-none truncate max-w-full ${active ? 'font-bold' : 'font-medium text-neutral-600'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
