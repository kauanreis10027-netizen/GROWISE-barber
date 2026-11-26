// GROWISE BARBER · funções auxiliares da página pública (sem dependências)

export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function duration(min) {
  const m = Number(min || 0)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

/** 'AAAA-MM-DD' + n dias (aritmética em UTC, sem depender do fuso do aparelho) */
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const dayFmt = (opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opts })
/** partes de um dia 'AAAA-MM-DD' para os botões de data */
export function dayParts(iso) {
  const d = new Date(iso + 'T12:00:00Z')
  return {
    week: dayFmt({ weekday: 'short' }).format(d).replace('.', ''),
    day: dayFmt({ day: '2-digit' }).format(d),
    month: dayFmt({ month: 'short' }).format(d).replace('.', ''),
  }
}
/** "quinta-feira, 27 de novembro" de um dia 'AAAA-MM-DD' */
export const longDay = (iso) => dayFmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00Z'))

/** data e hora de um instante (ISO) no fuso da barbearia */
export function whenParts(isoInstant, tz) {
  const d = new Date(isoInstant)
  const z = tz || 'America/Sao_Paulo'
  return {
    date: new Intl.DateTimeFormat('pt-BR', { timeZone: z, weekday: 'long', day: 'numeric', month: 'long' }).format(d),
    time: new Intl.DateTimeFormat('pt-BR', { timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
    short: new Intl.DateTimeFormat('pt-BR', { timeZone: z, day: '2-digit', month: '2-digit' }).format(d),
  }
}

export const digits = (s) => String(s || '').replace(/\D/g, '')
/** máscara (27) 99999-0000 enquanto digita */
export function maskPhone(v) {
  let d = digits(v)
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
export function phoneOk(v) {
  const d = digits(v)
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11
}
/** número para o wa.me (com 55) */
export function waNumber(v) {
  const d = digits(v)
  if (!d) return ''
  return d.length <= 11 ? '55' + d : d
}
export const firstName = (s) => String(s || '').trim().split(/\s+/)[0] || ''
export const initials = (s) => String(s || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase()

export const cancelUrl = (token) => `${window.location.origin}/cancelar/${token}`

/** limite de cancelamento em texto: 120 → "2 horas", 30 → "30 minutos", 1440 → "1 dia" */
export function limitText(min) {
  const m = Number(min || 0)
  if (m % 1440 === 0 && m >= 1440) return m === 1440 ? '1 dia' : `${m / 1440} dias`
  if (m % 60 === 0 && m >= 60) return m === 60 ? '1 hora' : `${m / 60} horas`
  return `${m} minutos`
}

/** regra de cancelamento em texto: "até 2 horas antes do horário" | "até o horário marcado" (prazo 0) */
export const cancelRule = (min) => (Number(min || 0) > 0 ? `até ${limitText(min)} antes do horário` : 'até o horário marcado')

/** mensagem de confirmação que o cliente envia a si mesmo pelo WhatsApp */
export function confirmMessage(b, page) {
  const w = whenParts(b.starts_at, b.timezone)
  const lines = [
    `✅ *Agendamento confirmado* · ${b.store_name}`,
    '',
    `✂️ ${b.service_name}`,
    b.professional_name ? `👤 ${b.professional_name}` : null,
    `📅 ${w.date}, às ${w.time}`,
    page?.store?.address ? `📍 ${page.store.address}` : null,
    '',
    `Para cancelar (${cancelRule(b.cancel_limit_minutes)}):`,
    cancelUrl(b.cancel_token),
  ]
  return lines.filter((l) => l !== null).join('\n')
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`

// ---- calendário ----
const icsTime = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function icsText(b, page) {
  const desc = [b.professional_name ? `Profissional: ${b.professional_name}` : '', `Cancelar: ${cancelUrl(b.cancel_token)}`].filter(Boolean).join('\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GROWISE//Barber//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.cancel_token.slice(0, 16)}@barber.growise.com.br`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(b.starts_at)}`,
    `DTEND:${icsTime(b.ends_at)}`,
    `SUMMARY:${icsEsc(`${b.service_name} · ${b.store_name}`)}`,
    page?.store?.address ? `LOCATION:${icsEsc(page.store.address)}` : null,
    `DESCRIPTION:${icsEsc(desc)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(b.service_name)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].filter((l) => l !== null).join('\r\n')
}

export function googleCalendarUrl(b, page) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${b.service_name} · ${b.store_name}`,
    dates: `${icsTime(b.starts_at)}/${icsTime(b.ends_at)}`,
    details: [b.professional_name ? `Profissional: ${b.professional_name}` : '', `Cancelar: ${cancelUrl(b.cancel_token)}`].filter(Boolean).join('\n'),
  })
  if (page?.store?.address) p.set('location', page.store.address)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function downloadIcs(b, page) {
  const blob = new Blob([icsText(b, page)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'agendamento.ics'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* segue para o plano B */ }
  try {
    const t = document.createElement('textarea')
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok
  } catch { return false }
}

// conveniências guardadas só neste aparelho (podem não existir: aba anônima, armazenamento bloqueado)
export function load(key, fallback = null) {
  try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
export function save(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* sem armazenamento: tudo bem */ }
}
export function loadSession(key) {
  try { const v = window.sessionStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
export function saveSession(key, value) {
  try { value === null ? window.sessionStorage.removeItem(key) : window.sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* ok */ }
}
