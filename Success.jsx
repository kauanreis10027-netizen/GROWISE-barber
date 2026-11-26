import { useState } from 'react'
import { brl, cancelUrl, confirmMessage, copyText, downloadIcs, firstName, googleCalendarUrl, cancelRule, waLink, whenParts } from './util.js'
import { Footer, Icon, Notice, StoreHead } from './ui.jsx'

/** Tela de sucesso: resumo + WhatsApp (o cliente envia para si mesmo) + copiar link + calendário. Sem envio automático. */
export default function Success({ b, page, onAgain }) {
  const [copied, setCopied] = useState(null)
  const [cal, setCal] = useState(false)
  const w = whenParts(b.starts_at, b.timezone)
  const end = whenParts(b.ends_at, b.timezone)
  const link = cancelUrl(b.cancel_token)
  const pg = page || { store: { address: b.address } }

  async function copy() {
    const ok = await copyText(link)
    setCopied(ok ? 'ok' : 'fail')
    if (ok) setTimeout(() => setCopied(null), 3000)
  }

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
          <a className="btn btn-wa btn-lg" href={waLink(b.phone, confirmMessage(b, pg))} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" /> Enviar confirmação pelo WhatsApp
          </a>
          <p className="muted small center">Abre o seu WhatsApp com os dados e o link de cancelamento. Você mesmo envia; nada é disparado automaticamente.</p>
          <button type="button" className="btn btn-ghost" onClick={copy}><Icon name={copied === 'ok' ? 'check' : 'copy'} /> {copied === 'ok' ? 'Link copiado' : 'Copiar link de cancelamento'}</button>
          {copied === 'fail' && <div className="manual"><span className="small muted">Não foi possível copiar. Selecione e copie:</span><input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de cancelamento" /></div>}
          <button type="button" className="btn btn-ghost" aria-expanded={cal} onClick={() => setCal((v) => !v)}><Icon name="calendar" /> Adicionar ao calendário</button>
          {cal && (
            <div className="cal">
              <a className="btn btn-ghost" href={googleCalendarUrl(b, pg)} target="_blank" rel="noopener noreferrer">Google Agenda</a>
              <button type="button" className="btn btn-ghost" onClick={() => downloadIcs(b, pg)}>iPhone / Outlook (.ics)</button>
            </div>
          )}
        </div>

        <Notice type="info">Guarde o link de cancelamento: é por ele que você cancela, {cancelRule(b.cancel_limit_minutes)}. Depois disso, fale com a barbearia{b.store_phone ? ` (${b.store_phone})` : ''}.</Notice>
        <button type="button" className="link again" onClick={onAgain}>Fazer outro agendamento</button>
      </section>
      <Footer />
    </div>
  )
}
