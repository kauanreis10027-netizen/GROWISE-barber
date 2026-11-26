// Pesquisa de satisfação (folha que sobe da parte de baixo, como no app de referência)
import { useState } from 'react'
import { supabase } from './supabase.js'
import { meMsg } from './auth.jsx'
import { Icon, Notice } from './ui.jsx'
import { whenParts } from './util.js'

export const TAGS = [['corte', 'Qualidade do corte'], ['atendimento', 'Atendimento'], ['pontualidade', 'Pontualidade'], ['ambiente', 'Ambiente'], ['higiene', 'Higiene'], ['atencao', 'Atenção do profissional']]
const LABEL = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente']

export function Stars({ value, size }) {
  return <span className={'stars' + (size ? ' ' + size : '')} aria-label={`${value} de 5 estrelas`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? 'on' : ''}><Icon name="star" fill="currentColor" /></span>)}</span>
}

export default function ReviewSheet({ a, onClose, onDone }) {
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [thanks, setThanks] = useState(false)
  const w = whenParts(a.starts_at, a.timezone)
  const toggle = (k) => setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))

  async function send(skip) {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('barber_me_review', skip ? { p_id: a.id, p_skip: true } : { p_id: a.id, p_rating: rating, p_tags: tags, p_comment: comment.trim() || null })
    setBusy(false)
    if (error && (error.message || '').trim() !== 'already_reviewed') return setErr(meMsg(error))
    if (skip) { onDone(); return }
    setThanks(true)
  }

  return (
    <div className="sheet-bg" role="presentation" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rv-t">
        <span className="grabber" aria-hidden="true" />
        {thanks ? (
          <div className="center thanks">
            <span className="ok-ic" aria-hidden="true"><Icon name="check" /></span>
            <h2 className="h1" id="rv-t">Obrigado pela avaliação!</h2>
            <p className="muted">Sua opinião ajuda {a.store_name} a atender cada vez melhor.</p>
            <button className="btn btn-primary btn-lg" onClick={onDone}>Fechar</button>
          </div>
        ) : (
          <>
            <div className="sheet-head">
              <div><h2 className="h1" id="rv-t">Pesquisa de satisfação</h2><p className="muted">Como foi sua experiência?</p></div>
              <button type="button" className="round" aria-label="Fechar" onClick={onClose} disabled={busy}><Icon name="x" /></button>
            </div>
            <div className="card rv-card center">
              <p className="rv-label">{LABEL[rating]}</p>
              <div className="stars pick" role="radiogroup" aria-label="Nota">
                {[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} estrela${i > 1 ? 's' : ''}`} className={i <= rating ? 'on' : ''} onClick={() => setRating(i)}><Icon name="star" fill="currentColor" /></button>)}
              </div>
              <p className="rv-store">{a.store_name}</p>
              <p className="muted">{a.service_name} · <span className="cap-inline">{w.date}</span>, {w.time}{a.professional_name ? ` com ${a.professional_name}` : ''}</p>
            </div>
            <p className="h3">O que você mais gostou?</p>
            <div className="chips">{TAGS.map(([k, l]) => <button key={k} type="button" aria-pressed={tags.includes(k)} className={'chip' + (tags.includes(k) ? ' on' : '')} onClick={() => toggle(k)}>{l}</button>)}</div>
            <label className="field"><span>Comentário sobre o profissional (opcional)</span>
              <textarea rows={3} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ex.: atendimento top, fez o corte exatamente como pedi." /></label>
            {err && <Notice type="error">{err}</Notice>}
            <div className="row-btns">
              <button type="button" className="btn btn-soft-danger" onClick={() => send(true)} disabled={busy}>Não avaliar</button>
              <button type="button" className="btn btn-primary" onClick={() => send(false)} disabled={busy}>{busy ? 'Enviando…' : 'Confirmar avaliação'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
