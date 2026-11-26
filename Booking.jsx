import { useEffect, useMemo, useRef, useState } from 'react'
import { book, getPage, getSlots } from './api.js'
import { addDays, brl, cancelRule, dayParts, digits, duration, initials, load, loadSession, longDay, maskPhone, phoneOk, save, saveSession } from './util.js'
import Success from './Success.jsx'
import { Footer, Icon, Notice, StoreHead } from './ui.jsx'

const ANY = 'any'
const SLOT_ERRORS = ['slot_unavailable', 'outside_hours', 'in_past', 'too_soon', 'too_far', 'invalid_start', 'invalid_date']
const period = (t) => { const h = Number(t.slice(0, 2)); return h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite' }

export default function Booking({ slug }) {
  const [page, setPage] = useState(null)
  const [pageErr, setPageErr] = useState(null)
  const [reload, setReload] = useState(0)
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
  const refs = { pro: useRef(null), when: useRef(null), form: useRef(null) }
  const go = (r) => setTimeout(() => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

  useEffect(() => {
    let off = false
    setPage(null); setPageErr(null)
    getPage(slug).then((p) => { if (!off) { setPage(p); document.title = `Agendar · ${p.store.name}` } })
      .catch((e) => { if (!off) setPageErr(e) })
    return () => { off = true }
  }, [slug, reload])

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

  // horários do dia escolhido
  useEffect(() => {
    if (!proReady || !date) return
    let off = false
    setSlots({ loading: true, list: null, error: null }); setSlot(null)
    getSlots(slug, service.id, proId === ANY ? null : proId, date)
      .then((r) => { if (!off) setSlots({ loading: false, list: r.slots || [], error: null }) })
      .catch((e) => { if (!off) setSlots({ loading: false, list: null, error: e }) })
    return () => { off = true }
  }, [slug, serviceId, proId, date, proReady, slotTick])

  function chooseService(id) {
    setServiceId(id); setSlot(null); setSlotMsg(null); setFormErr(null)
    const list = page.professionals.filter((p) => p.service_ids.includes(id))
    if (list.length === 1) { setProId(list[0].id); setDate((d) => d || days[0]); go(refs.when) }
    else { setProId((cur) => (cur === ANY || list.some((p) => p.id === cur) ? cur : null)); go(refs.pro) }
  }
  function choosePro(id) {
    setProId(id); setSlot(null); setSlotMsg(null); setFormErr(null)
    setDate((d) => d || days[0]); go(refs.when)
  }
  function chooseSlot(s) { setSlot(s); setSlotMsg(null); setFormErr(null); go(refs.form) }

  // procura o próximo dia com horário livre (até 14 dias à frente do dia escolhido)
  async function seekNext() {
    setSeeking(true)
    let i = days.indexOf(date) + 1
    const stop = Math.min(days.length, i + 14)
    try {
      for (; i < stop; i++) {
        const r = await getSlots(slug, service.id, proId === ANY ? null : proId, days[i])
        if (r.slots?.length) { setDate(days[i]); setSeeking(false); return }
      }
      setSlotMsg({ type: 'info', text: i >= days.length ? 'Não há horários livres no período aberto para agendamento.' : 'Nenhum horário livre nos próximos 14 dias. Escolha uma data mais à frente.' })
      if (i < days.length) setDate(days[Math.min(i, days.length - 1)])
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
      const result = { ...r, phone, name: name.trim(), address: page.store.address || null }
      saveSession('gwb:feito:' + slug, result)
      setDone(result); window.scrollTo({ top: 0 })
    } catch (err) {
      if (SLOT_ERRORS.includes(err.code)) {
        setSlot(null); setSlotMsg({ type: 'error', text: err.message }); setSlotTick((t) => t + 1); go(refs.when)
      } else setFormErr(err.message)
    }
    setSending(false)
  }
  function again() { saveSession('gwb:feito:' + slug, null); setDone(null); setSlot(null); setSlotTick((t) => t + 1); window.scrollTo({ top: 0 }) }

  if (pageErr) {
    const gone = pageErr.status === 404 || pageErr.status === 400
    return (
      <div className="wrap">
        <div className="card center empty-state">
          <span className="empty-ic"><Icon name={gone ? 'calendarOff' : 'wifiOff'} /></span>
          <h1 className="h1">{gone ? 'Agenda indisponível' : 'Não foi possível abrir a agenda'}</h1>
          <p className="muted">{gone ? 'Esta agenda não está disponível no momento. Confira o link com a barbearia.' : pageErr.message}</p>
          {!gone && <button className="btn btn-primary" onClick={() => setReload((n) => n + 1)}>Tentar de novo</button>}
        </div>
        <Footer />
      </div>
    )
  }
  if (!page) return <div className="wrap"><div className="skeleton head" /><div className="skeleton" /><div className="skeleton" /><p className="sr-only" role="status">Carregando…</p></div>
  if (done) return <Success b={done} page={page} slug={slug} onAgain={again} />

  const groups = []
  for (const s of slots.list || []) { const p = period(s.time); const g = groups.find((x) => x.p === p); g ? g.items.push(s) : groups.push({ p, items: [s] }) }
  const showPro = !!service && pros.length > 1

  return (
    <div className="wrap">
      <StoreHead store={page.store} />

      {page.services.length === 0 ? (
        <div className="card center empty-state"><p className="muted">Esta barbearia ainda não abriu horários para agendamento online.</p>
          {page.store.phone && <a className="btn btn-ghost" href={`tel:${digits(page.store.phone)}`}>Ligar para a barbearia</a>}</div>
      ) : (
        <>
          <section className="card step" aria-labelledby="t-serv">
            <h2 className="h2" id="t-serv"><span className="num">1</span> Escolha o serviço</h2>
            <div className="list" role="radiogroup" aria-labelledby="t-serv">
              {page.services.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={serviceId === s.id} className={'opt' + (serviceId === s.id ? ' on' : '')} onClick={() => chooseService(s.id)}>
                  <span className="opt-main"><strong>{s.name}</strong>{s.description && <span className="muted small clamp">{s.description}</span>}<span className="muted small">{duration(s.duration_minutes)}</span></span>
                  <span className="opt-side"><strong>{brl(s.price)}</strong><span className="tick" aria-hidden="true"><Icon name="check" /></span></span>
                </button>
              ))}
            </div>
          </section>

          {showPro && (
            <section className="card step" ref={refs.pro} aria-labelledby="t-pro">
              <h2 className="h2" id="t-pro"><span className="num">2</span> Escolha o profissional</h2>
              <div className="pros" role="radiogroup" aria-labelledby="t-pro">
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
            </section>
          )}

          {proReady && (
            <section className="card step" ref={refs.when} aria-labelledby="t-when">
              <h2 className="h2" id="t-when"><span className="num">{showPro ? 3 : 2}</span> Escolha o dia e o horário</h2>
              <div className="days" role="radiogroup" aria-label="Dia">
                {days.map((d, i) => { const p = dayParts(d); return (
                  <button key={d} type="button" role="radio" aria-checked={date === d} aria-label={longDay(d)} className={'day' + (date === d ? ' on' : '')} onClick={() => { setDate(d); setSlotMsg(null) }}>
                    <span className="small">{i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : p.week}</span><strong>{p.day}</strong><span className="small">{p.month}</span>
                  </button>) })}
              </div>
              {date && <p className="muted small day-title">{longDay(date)}{service && ` · ${duration(service.duration_minutes)}`}</p>}
              {slotMsg && <Notice type={slotMsg.type}>{slotMsg.text}</Notice>}
              {slots.loading ? <div className="slots">{Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton slot-sk" />)}</div>
                : slots.error ? <Notice type="error">{slots.error.message} <button className="link" onClick={() => setSlotTick((t) => t + 1)}>Tentar de novo</button></Notice>
                : slots.list && slots.list.length === 0 ? (
                  <div className="none"><p className="muted">Sem horários livres neste dia.</p>
                    {days.indexOf(date) < days.length - 1 && <button className="btn btn-ghost" onClick={seekNext} disabled={seeking}>{seeking ? 'Procurando…' : 'Ver próximo dia com horário'}</button>}</div>
                ) : groups.map((g) => (
                  <div key={g.p} className="slot-group">
                    <p className="small muted grp">{g.p}</p>
                    <div className="slots" role="radiogroup" aria-label={`Horários · ${g.p}`}>
                      {g.items.map((s) => <button key={s.starts_at} type="button" role="radio" aria-checked={slot?.starts_at === s.starts_at} className={'slot' + (slot?.starts_at === s.starts_at ? ' on' : '')} onClick={() => chooseSlot(s)}>{s.time}</button>)}
                    </div>
                  </div>
                ))}
            </section>
          )}

          {slot && (
            <section className="card step" ref={refs.form} aria-labelledby="t-form">
              <h2 className="h2" id="t-form"><span className="num">{showPro ? 4 : 3}</span> Seus dados</h2>
              <div className="summary">
                <div><Icon name="scissors" /><span><strong>{service.name}</strong> · {duration(service.duration_minutes)}</span></div>
                <div><Icon name="user" /><span>{proId === ANY ? 'Sem preferência de profissional' : pro?.name}</span></div>
                <div><Icon name="calendar" /><span className="cap">{longDay(date)}, às <strong>{slot.time}</strong></span></div>
                <div><Icon name="tag" /><span><strong>{brl(service.price)}</strong> <span className="muted small">· pagamento na barbearia</span></span></div>
              </div>
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
                <p className="muted small center">Sem cadastro e sem senha. Você pode cancelar pelo link {cancelRule(page.settings.cancel_limit_minutes)}.</p>
              </form>
            </section>
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
