import Booking from './Booking.jsx'
import CancelPage from './CancelPage.jsx'
import { Footer, Icon } from './ui.jsx'

// Endereços: /nome-da-barbearia (agendar) · /cancelar/<link> (ver ou cancelar). Sem login.
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function route(pathname) {
  const parts = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '').split('/')
  if (parts[0] === 'cancelar' && parts.length === 2) return { page: 'cancel', token: parts[1] }
  if (parts.length === 1 && parts[0].length >= 3 && parts[0].length <= 40 && SLUG_RE.test(parts[0].toLowerCase())) return { page: 'book', slug: parts[0].toLowerCase() }
  return { page: 'home' }
}

export default function App() {
  const r = route(window.location.pathname)
  if (r.page === 'cancel') return <CancelPage token={r.token} />
  if (r.page === 'book') return <Booking slug={r.slug} />
  return (
    <div className="wrap">
      <div className="card center empty-state">
        <span className="empty-ic"><Icon name="calendar" /></span>
        <h1 className="h1">GROWISE Barber</h1>
        <p className="muted">Agendamento online para barbearias. Use o link que a sua barbearia enviou, no formato <strong>barber.growise.com.br/nome-da-barbearia</strong>.</p>
      </div>
      <Footer />
    </div>
  )
}
