import { digits, initials, waNumber } from './util.js'
import symbol from './symbol.png'

const P = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" /></>,
  calendarOff: <><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18M9.5 13.5l5 5M14.5 13.5l-5 5" /></>,
  wifiOff: <><path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /><path d="M3 3l18 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7" /></>,
  scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.1 8.1L20 20M8.1 15.9L20 4" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  pin: <><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>,
  whatsapp: <><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1a4 4 0 0 1-3-3l1-1-1-2z" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></>,
}

export function Icon({ name }) {
  return <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{P[name]}</svg>
}

export function Notice({ type = 'info', children }) {
  return <div className={'notice notice-' + type} role={type === 'error' ? 'alert' : 'status'}><Icon name={type === 'error' ? 'alert' : 'info'} /><div>{children}</div></div>
}

export function StoreHead({ store, compact }) {
  const maps = store.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}` : null
  return (
    <header className={'store' + (compact ? ' compact' : '')}>
      <span className="logo">{store.logo_url ? <img src={store.logo_url} alt="" /> : initials(store.name)}</span>
      <div className="store-txt">
        <h1 className="store-name">{store.name}</h1>
        {!compact && (store.address || store.phone) && (
          <div className="store-meta">
            {store.address && <a href={maps} target="_blank" rel="noopener noreferrer"><Icon name="pin" />{store.address}</a>}
            {store.phone && <a href={`https://wa.me/${waNumber(store.phone)}`} target="_blank" rel="noopener noreferrer"><Icon name="phone" />{store.phone}</a>}
          </div>
        )}
        {!compact && <p className="muted small tagline">Agende seu horário online, sem cadastro.</p>}
      </div>
    </header>
  )
}

export const telLink = (phone) => `tel:${digits(phone)}`

export function Footer() {
  return (
    <footer className="foot">
      <img src={symbol} alt="" width="16" height="16" />
      <span>Agendamento online por <strong>GROWISE</strong></span>
    </footer>
  )
}
