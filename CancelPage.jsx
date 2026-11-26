import { useEffect, useState } from 'react'
import { cancel, lookup } from './api.js'
import { brl, digits, waNumber, whenParts } from './util.js'
import { Footer, Icon, Notice } from './ui.jsx'

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** Página do link de cancelamento: mostra o agendamento e permite cancelar até o prazo. */
export default function CancelPage({ token }) {
  const valid = TOKEN_RE.test(token)
  const [a, setA] = useState(null)
  const [err, setErr] = useState(valid ? null : { status: 404, message: 'Link de agendamento inválido. Confira o link que você recebeu.' })
  const [tick, setTick] = useState(0)
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actErr, setActErr] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!valid) return
    let off = false
    setErr(null)
    lookup(token).then((r) => { if (!off) { setA(r); document.title = `Seu agendamento · ${r.store_name}` } }).catch((e) => { if (!off) setErr(e) })
    return () => { off = true }
  }, [token, tick, valid])

  async function doCancel() {
    setBusy(true); setActErr(null)
    try {
      const r = await cancel(token)
      setResult(r); setA((x) => ({ ...x, status: 'cancelled', can_cancel: false })); setAsk(false)
    } catch (e) {
      setActErr(e.message)
      if (e.code === 'deadline_passed' || e.code === 'not_cancellable') setA((x) => ({ ...x, can_cancel: false }))
    }
    setBusy(false)
  }

  if (err) {
    const gone = err.status === 404 || err.status === 400
    return (
      <div className="wrap">
        <div className="card center empty-state">
          <span className="empty-ic"><Icon name={gone ? 'calendarOff' : 'wifiOff'} /></span>
          <h1 className="h1">{gone ? 'Agendamento não encontrado' : 'Não foi possível abrir'}</h1>
          <p className="muted">{gone ? 'Confira se o link está completo, do jeito que você recebeu.' : err.message}</p>
          {!gone && <button className="btn btn-primary" onClick={() => setTick((t) => t + 1)}>Tentar de novo</button>}
        </div>
        <Footer />
      </div>
    )
  }
  if (!a) return <div className="wrap"><div className="skeleton head" /><div className="skeleton" /><p className="sr-only" role="status">Carregando…</p></div>

  const w = whenParts(a.starts_at, a.timezone)
  const deadline = a.cancel_deadline ? whenParts(a.cancel_deadline, a.timezone) : null
  const cancelled = a.status === 'cancelled'
  const statusTxt = { confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Concluído', no_show: 'Não compareceu' }[a.status] || a.status
  const contact = a.store_phone && (
    <div className="row-btns">
      <a className="btn btn-ghost" href={`https://wa.me/${waNumber(a.store_phone)}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /> Falar com a barbearia</a>
      <a className="btn btn-ghost" href={`tel:${digits(a.store_phone)}`}><Icon name="phone" /> Ligar</a>
    </div>
  )

  return (
    <div className="wrap">
      <section className="card" aria-labelledby="t-c">
        <p className="muted small">{a.store_name}</p>
        <div className="row-between">
          <h1 className="h1" id="t-c">{result ? 'Agendamento cancelado' : `Olá${a.customer_first_name ? ', ' + a.customer_first_name : ''}!`}</h1>
          <span className={'pill pill-' + a.status}>{statusTxt}</span>
        </div>
        {result && <Notice type="info">{result.already ? 'Este agendamento já estava cancelado.' : 'Pronto! Seu horário foi liberado. A barbearia vê o cancelamento na agenda.'}</Notice>}

        <div className="summary big">
          <div><Icon name="scissors" /><span><strong>{a.service_name}</strong></span></div>
          {a.professional_name && <div><Icon name="user" /><span>com <strong>{a.professional_name}</strong></span></div>}
          <div><Icon name="calendar" /><span className={'cap' + (cancelled ? ' strike' : '')}><strong>{w.date}</strong>, às {w.time}</span></div>
          <div><Icon name="tag" /><span>{brl(a.price)}</span></div>
        </div>

        {a.status === 'confirmed' && a.can_cancel && !ask && (
          <>
            <p className="muted small">Você pode cancelar até {deadline ? `${deadline.short} às ${deadline.time}` : 'o prazo da barbearia'}.</p>
            <button className="btn btn-danger btn-lg" onClick={() => { setAsk(true); setActErr(null) }}>Cancelar agendamento</button>
          </>
        )}
        {ask && (
          <div className="confirm-box" role="group" aria-label="Confirmar cancelamento">
            <p><strong>Cancelar este horário?</strong> Ele fica livre para outra pessoa e não dá para desfazer.</p>
            <div className="row-btns">
              <button className="btn btn-danger" onClick={doCancel} disabled={busy}>{busy ? 'Cancelando…' : 'Sim, cancelar'}</button>
              <button className="btn btn-ghost" onClick={() => setAsk(false)} disabled={busy}>Manter horário</button>
            </div>
          </div>
        )}
        {actErr && <Notice type="error">{actErr}</Notice>}
        {a.status === 'confirmed' && !a.can_cancel && (
          <><Notice type="info">O prazo para cancelar pelo link já passou. Se não puder ir, avise a barbearia.</Notice>{contact}</>
        )}
        {a.status !== 'confirmed' && !result && <p className="muted small">Este agendamento não pode mais ser alterado pelo link.</p>}

        {(cancelled || result) && a.store_slug && <a className="btn btn-primary btn-lg" href={`/${a.store_slug}`}>Agendar novo horário</a>}
        {a.status === 'confirmed' && a.can_cancel && a.store_phone && !ask && <div className="sub-contact">{contact}</div>}
      </section>
      <Footer />
    </div>
  )
}
