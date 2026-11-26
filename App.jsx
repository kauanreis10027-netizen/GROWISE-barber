import Booking from './Booking.jsx'
import CancelPage from './CancelPage.jsx'
import { AuthProvider } from './auth.jsx'
import { useLocation } from './router.jsx'
import { Appointments, Home, Menu, Tabs } from './AppPages.jsx'
import { Login, NewPassword, Recover, Signup } from './AuthPages.jsx'

// Endereços: / (início) · /agendamentos · /menu/... · /entrar · /cadastro · /recuperar · /nova-senha
//            /cancelar/<link> · /nome-da-barbearia (agendar)
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED = ['entrar', 'cadastro', 'recuperar', 'nova-senha', 'agendamentos', 'menu', 'cancelar']

export function route(pathname) {
  const parts = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '').split('/')
  if (parts[0] === 'cancelar' && parts.length === 2) return { page: 'cancel', token: parts[1] }
  if (parts[0] === '' && parts.length === 1) return { page: 'home' }
  if (parts[0] === 'agendamentos') return { page: 'appts' }
  if (parts[0] === 'menu') return { page: 'menu' }
  if (['entrar', 'cadastro', 'recuperar', 'nova-senha'].includes(parts[0]) && parts.length === 1) return { page: parts[0] }
  const s = parts[0].toLowerCase()
  if (parts.length === 1 && s.length >= 3 && s.length <= 40 && SLUG_RE.test(s) && !RESERVED.includes(s)) return { page: 'book', slug: s }
  return { page: 'home' }
}

function Router() {
  const { path, search } = useLocation()
  const r = route(path)
  if (r.page === 'cancel') return <CancelPage token={r.token} />
  if (r.page === 'book') return <Booking slug={r.slug} />
  if (r.page === 'entrar') return <Login search={search} />
  if (r.page === 'cadastro') return <Signup search={search} />
  if (r.page === 'recuperar') return <Recover />
  if (r.page === 'nova-senha') return <NewPassword />
  return (
    <>
      {r.page === 'appts' ? <Appointments search={search} /> : r.page === 'menu' ? <Menu path={path} /> : <Home />}
      <Tabs path={path} />
    </>
  )
}

export default function App() {
  return <AuthProvider><Router /></AuthProvider>
}
