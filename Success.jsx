import { useState } from 'react'
import { barberMessage, brl, downloadIcs, firstName, googleCalendarUrl, waLink, whenParts } from './util.js'
import { Footer, Icon, StoreHead } from './ui.jsx'
import { Link } from './router.jsx'

/** Tela de agendamento confirmado: resumo + aviso ao WhatsApp da barbearia (envio manual) + calendário.
 *  Aparece só logo depois de agendar; não fica guardada. Cancelamento: pela área "Meus agendamentos". */
export default function Success({ b, page, onAgain }) {
  const [cal, setCal] = useState(false)
  const w = whenParts(b.starts_at, b.timezone)
  const end = whenParts(b.ends_at, b.timezone)
  const pg = page || { store: { address: b.address } }

  return (
    <div className="wrap">
      {page && <StoreHead store={page.store} compact />}
      <section className="card success" aria-labelledby="t-ok">
        <span className="ok-ic" aria-hidden="true"><Icon name="check" /></span>
        <h1 className="h1" id="t-ok" tabIndex={-1}>Agendamento confirmado!</h1>
        <p className="muted">{firstName(b.name || '') ? `${firstName(b.name)}, seu` : 'Seu'} horário em {b.store_name} está reservado. Te esperamos!</p>

        <div className="summary big">
          <div><Icon name="scissors" /><span><strong>{b.service_name}</strong></span></div>
          {b.professional_name && <div><Icon name="user" /><span>com <strong>{b.professional_name}</strong></span></div>}
          <div><Icon name="calendar" /><span className="cap"><strong>{w.date}</strong><br />{w.time} às {end.time}</span></div>
          <div><Icon name="tag" /><span><strong>{brl(b.price)}</strong> <span className="muted small">· pagamento na barbearia</span></span></div>
          {pg.store.address && <div><Icon name="pin" /><span>{pg.store.address}</span></div>}
        </div>

        <div className="actions">
          {b.barber_whatsapp && (
            <>
              <a className="btn btn-wa btn-lg" href={waLink(b.barber_whatsapp, barberMessage(b))} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" /> Enviar confirmação pelo WhatsApp
              </a>
              <p className="muted small center">Abre a conversa com a barbearia com os dados do seu agendamento. É só tocar em enviar.</p>
            </>
          )}
          <button type="button" className="btn btn-ghost" aria-expanded={cal} onClick={() => setCal((v) => !v)}><Icon name="calendar" /> Adicionar ao calendário</button>
          {cal && (
            <div className="cal">
              <a className="btn btn-ghost" href={googleCalendarUrl(b, pg)} target="_blank" rel="noopener noreferrer">Google Agenda</a>
              <button type="button" className="btn btn-ghost" onClick={() => downloadIcs(b, pg)}>iPhone / Outlook (.ics)</button>
            </div>
          )}
        </div>

        {b.account
          ? <Link className="btn btn-primary btn-lg" to="/agendamentos">Ver meus agendamentos</Link>
          : <p className="muted small center"><Link className="link" to="/cadastro">Crie sua conta</Link> para ver e gerenciar seus próximos agendamentos.</p>}
        <button type="button" className="link again" onClick={onAgain}>Fazer novo agendamento</button>
      </section>
      <Footer />
    </div>
  )
}
