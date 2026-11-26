import { useEffect, useMemo, useRef, useState } from 'react'
import { book, getPage, getSlots } from './api.js'
import { useAuth } from './auth.jsx'
import { Link, navigate } from './router.jsx'
import { addDays, brl, cancelRule, dayParts, digits, duration, initials, load, loadSession, longDay, maskPhone, phoneOk, save, saveSession } from './util.js'
import Success from './Success.jsx'
import { Footer, Icon, Notice } from './ui.jsx'

const ANY = 'any'
const SLOT_ERRORS = ['slot_unavailable', 'outside_hours', 'in_past', 'too_soon', 'too_far', 'invalid_start', 'invalid_date']
const period = (t) => { const h = Number(t.slice(0, 2)); return h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite' }
const monthTitle = (iso) => { const s = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00Z')).replace(' de ', ' '); return s[0].toUpperCase() + s.slice(1) }

/** guarda a barbearia (e as unidades da rede) para a tela inicial do app */
function rememberStore(page) {
  const list = load('gwb:lojas', [])
  const add = [{ slug: page.store.slug, name: page.store.name, address: page.store.address || null }, ...(page.units || [])]
  const out = [...add, ...list].filter((x, i, a) => x?.slug && a.findIndex((y) => y.slug === x.slug) === i).slice(0, 12)
  save('gwb:lojas', out); save('gwb:ultima-loja', page.store.slug)
}

export default function Booking({ slug }) {
  const { user, me, reload } = useAuth()
  const [page, setPage] = useState(null)
  const [pageErr, setPageErr] = useState(null)
  const [retry, setRetry] = useState(0)
  const [serviceId, setServiceId] = useState(null)
  const [proId, setProId] = useState(null)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState({ loading: false, list: null, error: null })
  const [slotTick, setSlotTick] = useState(0)
  const [slot, setSlot] = useState(null)
  const [slotMsg, setSlotMsg] = useState(null)
  const [seeking, setSeeking] = useState(false)
  const saved = load('gwb:cliente', {})
  const [name, setName] = useState(saved.name || '')
  const [phone, setPhone] = useState(saved.phone || '')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [formErr, setFormErr] = useState(null)
  const [done, setDone] = useState(() => loadSession('gwb:feito:' + slug))
  const refs = { when: useRef(null), form: useRef(null) }
  const go = (r) => setTimeout(() => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

  useEffect(() => {
    let off = false
    setPage(null); setPageErr(null); setServiceId(null); setProId(null); setSlot(null); setDone(loadSession('gwb:feito:' + slug))
    getPage(slug).then((p) => { if (off) return; setPage(p); setDate(p.settings.today); rememberStore(p); document.title = `Agendar · ${p.store.name}` })
      .catch((e) => { if (!off) setPageErr(e) })
    return () => { off = true }
  }, [slug, retry])

  // com login: nome e telefone vêm da conta
  useEffect(() => {
    if (!me?.profile) return
    if (me.profile.full_name) setName((n) => n || me.profile.full_name)
    if (me.profile.phone) setPhone((p) => p || maskPhone(me.profile.phone))
  }, [me])

  const service = page?.services.find((s) => s.id === serviceId) || null
  const pros = useMemo(() => (page && service ? page.professionals.filter((p) => p.service_ids.includes(service.id)) : []), [page, service])
  const allowAny = !!page?.settings.allow_any_professional && pros.length > 1
  const pro = pros.find((p) => p.id === proId) || null
  const proReady = !!service && (proId === ANY || !!pro)
  const days = useMemo(() => {
    if (!page) return []
    const n = Math.min(Math.max(Number(page.settings.max_days_ahead) || 30, 0), 90)
    return Array.from({ length: n + 1 }, (_, i) => addDays(page.settings.today, i))
  }, [page])
  const units = (page?.units || []).filter((u) => u.slug)

  useEffect(() => {
    if (!proReady || !date) return
    let off = false
    setSlots({ loading: true, list: null, error: null }); setSlot(null)
    getSlots(slug, service.id, proId === ANY ? null : proId, date)
      .then((r) => { if (!off) setSlots({ loading: false, list: r.slots || [], error: null }) })
      .catch((e) => { if (!off) setSlots({ loading: false, list: null, error: e }) })
    return () => { off = true }
  }, [slug, serviceId, proId, date, proReady, slotTick]) // eslint-disable-line react-hooks/exhaustive-deps

  function chooseService(id) {
    setServiceId(id); setSlot(null); setSlotMsg(null); setFormErr(null)
    const list = page.professionals.filter((p) => p.service_ids.includes(id))
    setProId((cur) => (list.length === 1 ? list[0].id : cur === ANY || list.some((p) => p.id === cur) ? cur : null))
    go(refs.when)
  }
  function choosePro(id) { setProId(id); setSlot(null); setSlotMsg(null); setFormErr(null) }
  function chooseSlot(s) { setSlot(s); setSlotMsg(null); setFormErr(null); go(refs.form) }

  async function seekNext() {
    setSeeking(true)
    let i = days.indexOf(date) + 1
    const stop = Math.min(days.length, i + 14)
    try {
      for (; i < stop; i++) {
        const r = await getSlots(slug, service.id, proId === ANY ? null : proId, days[i])
        if (r.slots?.length) { setDate(days[i]); setSeeking(false); return }
      }
      setSlotMsg({ type: 'info', text: i >= days.length ? 'Não há horários livres no período aberto para agendamento.' : 'Nenhum horário livre nos próximos 14 dias. Escolha uma data mais à frente ou outro profissional.' })
    } catch (e) { setSlotMsg({ type: 'error', text: e.message }) }
    setSeeking(false)
  }

  const nameOk = name.trim().length >= 2
  const okPhone = phoneOk(phone)
  async function confirm(e) {
    e.preventDefault()
    setTouched(true); setFormErr(null)
    if (!nameOk || !okPhone || !slot) return
    setSending(true)
    try {
      const r = await book({ slug, service_id: service.id, professional_id: proId === ANY ? null : proId, starts_at: slot.starts_at, name: name.trim(), phone })
      save('gwb:cliente', { name: name.trim(), phone })
      const result = { ...r, phone, name: name.trim(), address: page.store.address || null, account: !!user }
      saveSession('gwb:feito:' + slug, result)
      setDone(result); window.scrollTo({ top: 0 })
      if (user) reload()
    } catch (err) {
      if (SLOT_ERRORS.includes(err.code)) { setSlot(null); setSlotMsg({ type: 'error', text: err.message }); setSlotTick((t) => t + 1); go(refs.when) }
      else setFormErr(err.message)
    }
    setSending(false)
  }
  function again() { saveSession('gwb:feito:' + slug, null); setDone(null); setSlot(null); setSlotTick((t) => t + 1); window.scrollTo({ top: 0 }) }

  const top = (title) => (
    <header className="topbar">
      <button type="button" className="round" aria-label="Voltar" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}><Icon name="back" /></button>
      <h1 className="top-title">{title}</h1>
      <span className="round ghost" aria-hidden="true" />
    </header>
  )

  if (pageErr) {
    const gone = pageErr.status === 404 || pageErr.status === 400
    return (
      <div className="wrap">
        {top('Agendar')}
        <div className="card center empty-state">
          <span className="empty-ic"><Icon name={gone ? 'calendarOff' : 'wifiOff'} /></span>
          <h2 className="h1">{gone ? 'Agenda indisponível' : 'Não foi possível abrir a agenda'}</h2>
          <p className="muted">{gone ? 'Esta agenda não está disponível no momento. Confira o link com a barbearia.' : pageErr.message}</p>
          {!gone && <button className="btn btn-primary" onClick={() => setRetry((n) => n + 1)}>Tentar de novo</button>}
        </div>
        <Footer />
      </div>
    )
  }
  if (!page) return <div className="wrap">{top('Agendar')}<div className="skeleton head" /><div className="skeleton" /><p className="sr-only" role="status">Carregando…</p></div>
  if (done) return <Success b={done} page={page} slug={slug} onAgain={again} />

  const groups = []
  for (const s of slots.list || []) { const p = period(s.time); const g = groups.find((x) => x.p === p); g ? g.items.push(s) : groups.push({ p, items: [s] }) }
  const monthOf = date || days[0]

  return (
    <div className="wrap">
      {top(page.store.name)}
      <section className="hero-store">
        <span className="logo">{page.store.logo_url ? <img src={page.store.logo_url} alt="" /> : initials(page.store.name)}</span>
        <div className="store-txt">
          <p className="store-name">{page.store.name}</p>
          {page.store.address && <a className="muted small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.store.address)}`} target="_blank" rel="noopener noreferrer"><Icon name="pin" /> {page.store.address}</a>}
        </div>
      </section>

      {!user && <div className="hint"><Icon name="menu" /><span><Link to={`/entrar?volta=/${slug}`}>Entre</Link> ou <Link to={`/cadastro?volta=/${slug}`}>crie sua conta</Link> para acompanhar seus agendamentos e avaliar o atendimento.</span></div>}

      {units.length > 1 && (
        <section className="card step" aria-labelledby="t-unit">
          <h2 className="h2" id="t-unit">Unidade</h2>
          <div className="list" role="radiogroup" aria-labelledby="t-unit">
            {units.map((u) => (
              <button key={u.slug} type="button" role="radio" aria-checked={u.slug === slug} className={'opt' + (u.slug === slug ? ' on' : '')} onClick={() => u.slug !== slug && navigate('/' + u.slug)}>
                <span className="opt-main"><strong>{u.name}</strong>{u.address && <span className="muted small">{u.address}</span>}</span>
                <span className="opt-side"><span className="tick" aria-hidden="true"><Icon name="check" /></span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {page.services.length === 0 ? (
        <div className="card center empty-state"><p className="muted">Esta barbearia ainda não abriu horários para agendamento online.</p>
          {page.store.phone && <a className="btn btn-ghost" href={`tel:${digits(page.store.phone)}`}>Ligar para a barbearia</a>}</div>
      ) : (
        <>
          <section className="card step" aria-labelledby="t-serv">
            <h2 className="h2" id="t-serv">Escolha o serviço</h2>
            <div className="list" role="radiogroup" aria-labelledby="t-serv">
              {page.services.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={serviceId === s.id} className={'opt' + (serviceId === s.id ? ' on' : '')} onClick={() => chooseService(s.id)}>
                  <span className="opt-main"><strong>{s.name}</strong>{s.description && <span className="muted small clamp">{s.description}</span>}<span className="muted small">{duration(s.duration_minutes)}</span></span>
                  <span className="opt-side"><strong>{brl(s.price)}</strong><span className="tick" aria-hidden="true"><Icon name="check" /></span></span>
                </button>
              ))}
            </div>
          </section>

          {service && (
            <section className="card step agenda" ref={refs.when} aria-labelledby="t-when">
              <h2 className="month" id="t-when">{monthTitle(monthOf)}</h2>
              <div className="days" role="radiogroup" aria-label="Dia">
                {days.map((d) => { const p = dayParts(d); return (
                  <button key={d} type="button" role="radio" aria-checked={date === d} aria-label={longDay(d)} className={'day' + (date === d ? ' on' : '')} onClick={() => { setDate(d); setSlotMsg(null) }}>
                    <span className="wk">{p.week}</span><strong>{Number(p.day)}</strong>
                  </button>) })}
              </div>
              <h3 className="h3">Selecione o profissional</h3>
              <div className="pros" role="radiogroup" aria-label="Profissional">
                {allowAny && (
                  <button type="button" role="radio" aria-checked={proId === ANY} className={'pro' + (proId === ANY ? ' on' : '')} onClick={() => choosePro(ANY)}>
                    <span className="avatar any"><Icon name="users" /></span><span>Sem preferência</span>
                  </button>
                )}
                {pros.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={proId === p.id} className={'pro' + (proId === p.id ? ' on' : '')} onClick={() => choosePro(p.id)}>
                    <span className="avatar">{p.photo_url ? <img src={p.photo_url} alt="" /> : initials(p.name)}</span><span>{p.name}</span>
                  </button>
                ))}
              </div>
              <hr className="sep" />
              {!proReady ? <p className="muted center pick">Escolha o profissional para ver os horários.</p> : (
                <>
                  {date && <p className="muted small day-title">{longDay(date)} · {duration(service.duration_minutes)}</p>}
                  {slotMsg && <Notice type={slotMsg.type}>{slotMsg.text}</Notice>}
                  {slots.loading ? <div className="slots">{Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton slot-sk" />)}</div>
                    : slots.error ? <Notice type="error">{slots.error.message} <button className="link" onClick={() => setSlotTick((t) => t + 1)}>Tentar de novo</button></Notice>
                    : slots.list && slots.list.length === 0 ? (
                      <div className="none center">
                        <h3 className="h2">Nenhum horário disponível</h3>
                        <p className="muted">Não encontramos horários disponíveis para este profissional neste dia. Experimente outra data ou escolha outro profissional.</p>
                        {days.indexOf(date) < days.length - 1 && <button className="btn btn-primary" onClick={seekNext} disabled={seeking}>{seeking ? 'Procurando…' : 'Ver próximo dia com horário'}</button>}
                      </div>
                    ) : groups.map((g) => (
                      <div key={g.p} className="slot-group">
                        <p className="small muted grp">{g.p}</p>
                        <div className="slots" role="radiogroup" aria-label={`Horários · ${g.p}`}>
                          {g.items.map((s) => <button key={s.starts_at} type="button" role="radio" aria-checked={slot?.starts_at === s.starts_at} className={'slot' + (slot?.starts_at === s.starts_at ? ' on' : '')} onClick={() => chooseSlot(s)}>{s.time}</button>)}
                        </div>
                      </div>
                    ))}
                </>
              )}
            </section>
          )}

          {slot && (
            <section className="card step" ref={refs.form} aria-labelledby="t-form">
              <h2 className="h2" id="t-form">Confirmar agendamento</h2>
              <dl className="resume">
                <div><dt>Unidade</dt><dd>{page.store.name}</dd></div>
                <div><dt>Serviço</dt><dd>{service.name} · {duration(service.duration_minutes)}</dd></div>
                <div><dt>Profissional</dt><dd>{proId === ANY ? 'Sem preferência' : pro?.name}</dd></div>
                <div><dt>Data</dt><dd className="cap">{longDay(date)}</dd></div>
                <div><dt>Horário</dt><dd><strong>{slot.time}</strong></dd></div>
                <div><dt>Valor</dt><dd><strong>{brl(service.price)}</strong> <span className="muted small">· na barbearia</span></dd></div>
              </dl>
              <form onSubmit={confirm} noValidate>
                <label className="field"><span>Seu nome</span>
                  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" placeholder="Nome e sobrenome" aria-invalid={touched && !nameOk} />
                  {touched && !nameOk && <span className="err">Informe seu nome.</span>}
                </label>
                <label className="field"><span>WhatsApp</span>
                  <input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel-national" placeholder="(27) 99999-0000" aria-invalid={touched && !okPhone} />
                  {touched && !okPhone && <span className="err">Informe um celular válido com DDD.</span>}
                </label>
                {formErr && <Notice type="error">{formErr}</Notice>}
                <button className="btn btn-primary btn-lg" type="submit" disabled={sending}>{sending ? 'Confirmando…' : 'Confirmar agendamento'}</button>
                <p className="muted small center">{user ? 'O agendamento fica salvo na sua conta.' : 'Sem cadastro e sem senha.'} Você pode cancelar {cancelRule(page.settings.cancel_limit_minutes)}.</p>
              </form>
            </section>
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
