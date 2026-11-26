// Telas do app do cliente: Início, Agendamentos/Histórico, Menu (dados, segurança, preferências)
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { authMsg, meMsg, useAuth } from './auth.jsx'
import { Link, navigate, param } from './router.jsx'
import { brl, firstName, initials, load, maskPhone, phoneOk, waNumber, whenParts } from './util.js'
import { getTheme, setTheme } from './theme.js'
import ReviewSheet, { Stars, TAGS } from './ReviewSheet.jsx'
import { Footer, Icon, Notice } from './ui.jsx'

const DAY = 864e5
const isUpcoming = (a) => a.status === 'confirmed' && Date.parse(a.ends_at) > Date.now()
const todayLabel = () => { const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()).replace('.', '').replace(/ de /g, ' '); return s[0].toUpperCase() + s.slice(1) }
const dayKey = (ms) => new Date(ms).toLocaleDateString('en-CA')   // dia do calendário no aparelho
const daysAgo = (iso) => Math.max(0, Math.round((Date.parse(dayKey(Date.now())) - Date.parse(dayKey(Date.parse(iso)))) / DAY))
const agoText = (n) => (n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`)

/** barra de abas inferior (Início · Agendamentos · Menu) */
export function Tabs({ path }) {
  const tab = path.startsWith('/agendamentos') ? 'ag' : path.startsWith('/menu') ? 'menu' : 'home'
  const T = ({ id, to, icon, label }) => <Link to={to} className={'tab' + (tab === id ? ' on' : '')} aria-current={tab === id ? 'page' : undefined}><Icon name={icon} /><span>{label}</span></Link>
  return <nav className="tabs" aria-label="Navegação"><T id="home" to="/" icon="home" label="Início" /><T id="ag" to="/agendamentos" icon="calendar" label="Agendamentos" /><T id="menu" to="/menu" icon="menu" label="Menu" /></nav>
}

function useReviewPrompt() {
  const { me, reload } = useAuth()
  const [open, setOpen] = useState(null)
  useEffect(() => {
    const p = me?.pending_review
    if (!p) return
    let shown = false
    try { shown = sessionStorage.getItem('gwb:rv:' + p.id) === '1' } catch { /* ok */ }
    if (!shown) { setOpen(p); try { sessionStorage.setItem('gwb:rv:' + p.id, '1') } catch { /* ok */ } }
  }, [me?.pending_review?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const sheet = open && <ReviewSheet a={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload() }} />
  return [sheet, setOpen]
}

function Welcome() {
  const last = load('gwb:ultima-loja', null)
  return (
    <div className="wrap app">
      <section className="welcome card center">
        <span className="brand-mark"><Icon name="scissors" /></span>
        <h1 className="h1">Seu horário na barbearia, sem fila e sem ligação</h1>
        <p className="muted">Crie sua conta para agendar mais rápido, acompanhar seus horários, ver seu histórico e avaliar os atendimentos.</p>
        <Link className="btn btn-primary btn-lg" to="/cadastro">Criar conta</Link>
        <Link className="btn btn-ghost btn-lg" to="/entrar">Já tenho conta</Link>
        {last ? <Link className="link" to={'/' + last}>Agendar sem conta</Link> : <p className="muted small">Para agendar sem conta, use o link que a sua barbearia enviou.</p>}
      </section>
      <Footer />
    </div>
  )
}

export function Home() {
  const { user, me, meErr, reload } = useAuth()
  const [sheet, openReview] = useReviewPrompt()
  if (!user) return <Welcome />
  if (meErr) return <div className="wrap app"><Notice type="error">{meMsg(meErr)} <button className="link" onClick={reload}>Tentar de novo</button></Notice></div>
  if (!me) return <div className="wrap app"><div className="skeleton head" /><div className="skeleton" /><p className="sr-only" role="status">Carregando…</p></div>
  const list = me.appointments
  const next = list.filter(isUpcoming).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0]
  const lastDone = list.find((a) => a.status === 'completed')
  const lastAny = next || list[0]
  const stores = [...list.map((a) => ({ slug: a.store_slug, name: a.store_name, address: a.store_address })), ...load('gwb:lojas', [])]
    .filter((x, i, arr) => x?.slug && arr.findIndex((y) => y.slug === x.slug) === i)
  const mainStore = lastAny ? { slug: lastAny.store_slug, name: lastAny.store_name } : stores[0]
  const name = firstName(me.profile.full_name) || 'cliente'
  return (
    <div className="wrap app">
      <header className="hello">
        <div><h1 className="hello-t">Olá, <span>{name}</span>!</h1><p className="muted">{todayLabel()}</p></div>
        <Link className="round" to="/agendamentos?aba=concluidos" aria-label="Histórico"><Icon name="history" /></Link>
      </header>

      {me.pending_review && (
        <button type="button" className="card rv-cta" onClick={() => openReview(me.pending_review)}>
          <span className="stars mini"><Icon name="star" fill="currentColor" /></span>
          <span><strong>Como foi sua experiência?</strong><span className="muted small">Avalie {me.pending_review.service_name} em {me.pending_review.store_name}</span></span>
          <Icon name="chevron" />
        </button>
      )}

      {next && (
        <section>
          <h2 className="sec">Próximo agendamento</h2>
          <Link className="card appt-row" to="/agendamentos">
            <span className="logo sm">{initials(next.store_name)}</span>
            <span className="grow"><strong>{next.store_name}</strong><span className="muted small cap">{whenParts(next.starts_at, next.timezone).date}, {whenParts(next.starts_at, next.timezone).time} · {next.service_name}</span></span>
            <span className="go"><Icon name="chevron" /></span>
          </Link>
        </section>
      )}

      <section>
        <h2 className="sec">Último atendimento</h2>
        {lastDone ? (
          <Link className="card appt-row" to="/agendamentos?aba=concluidos">
            <span className="logo sm">{initials(lastDone.store_name)}</span>
            <span className="grow"><strong>{lastDone.store_name}</strong><span className="muted small">{lastDone.service_name} · {agoText(daysAgo(lastDone.starts_at))}{lastDone.professional_name ? ` com ${lastDone.professional_name}` : ''}</span></span>
            <span className="go"><Icon name="chevron" /></span>
          </Link>
        ) : <p className="muted card">Você ainda não tem atendimentos concluídos. Depois do seu primeiro corte, ele aparece aqui.</p>}
      </section>

      {mainStore && (
        <Link className="banner" to={'/' + mainStore.slug}>
          <span className="banner-logo">{initials(mainStore.name)}</span>
          <span className="banner-name">{mainStore.name}</span>
          <span className="btn btn-light">Novo agendamento</span>
        </Link>
      )}

      <section>
        <h2 className="sec">{stores.length > 1 ? 'Unidades' : 'Sua barbearia'}</h2>
        {stores.length === 0 ? <p className="muted card">Abra o link de agendamento da sua barbearia uma vez e ela aparece aqui.</p> : (
          <div className="units">
            {stores.map((s) => (
              <Link key={s.slug} className="unit" to={'/' + s.slug}>
                <span className="logo md">{initials(s.name)}</span>
                <span className="grow"><strong>{s.name}</strong>{s.address && <span className="muted small clamp1">{s.address}</span>}</span>
                <Icon name="chevron" />
              </Link>
            ))}
          </div>
        )}
      </section>
      {sheet}
    </div>
  )
}

function ApptCard({ a, onChanged, onReview }) {
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const w = whenParts(a.starts_at, a.timezone)
  const end = whenParts(a.ends_at, a.timezone)
  const st = isUpcoming(a) ? ['ok', 'Confirmado'] : a.status === 'completed' ? ['done', 'Concluído'] : a.status === 'no_show' ? ['off', 'Não compareceu'] : a.status === 'cancelled' ? ['off', 'Cancelado'] : ['off', 'Encerrado']
  async function cancel() {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('barber_me_cancel', { p_id: a.id })
    setBusy(false)
    if (error) return setErr(meMsg(error))
    setAsk(false); onChanged()
  }
  return (
    <article className="card appt">
      <div className="row-between"><strong>{a.store_name}</strong><span className={'pill pill-' + st[0]}>{st[1]}</span></div>
      <p className="appt-when cap">{w.date}</p>
      <p className="muted">{w.time} às {end.time} · {a.service_name}{a.professional_name ? ` · ${a.professional_name}` : ''}</p>
      <p className="appt-price">{brl(a.price)}</p>
      {a.review?.status === 'done' && <div className="rv-done"><Stars value={a.review.rating} size="sm" />{a.review.tags?.length > 0 && <span className="muted small">{a.review.tags.map((t) => TAGS.find((x) => x[0] === t)?.[1]).filter(Boolean).join(' · ')}</span>}</div>}
      {err && <Notice type="error">{err}</Notice>}
      <div className="row-btns">
        {a.status === 'completed' && !a.review && <button className="btn btn-primary" onClick={() => onReview(a)}><Icon name="star" /> Avaliar</button>}
        {a.status === 'completed' && a.store_slug && <Link className="btn btn-ghost" to={'/' + a.store_slug}>Agendar de novo</Link>}
        {isUpcoming(a) && a.can_cancel && !ask && <button className="btn btn-danger" onClick={() => setAsk(true)}>Cancelar</button>}
        {isUpcoming(a) && !a.can_cancel && a.store_phone && <a className="btn btn-ghost" href={`https://wa.me/${waNumber(a.store_phone)}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /> Falar com a barbearia</a>}
      </div>
      {ask && (
        <div className="confirm-box">
          <p><strong>Cancelar este horário?</strong> Ele fica livre para outra pessoa.</p>
          <div className="row-btns"><button className="btn btn-danger" onClick={cancel} disabled={busy}>{busy ? 'Cancelando…' : 'Sim, cancelar'}</button><button className="btn btn-ghost" onClick={() => setAsk(false)} disabled={busy}>Manter</button></div>
        </div>
      )}
    </article>
  )
}

export function Appointments({ search }) {
  const { user, me, meErr, reload } = useAuth()
  const [review, setReview] = useState(null)
  const tab = param(search, 'aba') || 'proximos'
  useEffect(() => { if (user) reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <NeedLogin title="Seus agendamentos" />
  if (meErr) return <div className="wrap app"><Notice type="error">{meMsg(meErr)} <button className="link" onClick={reload}>Tentar de novo</button></Notice></div>
  if (!me) return <div className="wrap app"><div className="skeleton" /><p className="sr-only" role="status">Carregando…</p></div>
  const all = me.appointments
  const groups = {
    proximos: all.filter(isUpcoming).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    concluidos: all.filter((a) => a.status === 'completed'),
    cancelados: all.filter((a) => a.status === 'cancelled' || a.status === 'no_show'),
  }
  const done = groups.concluidos
  const gaps = done.slice(0, -1).map((a, i) => (Date.parse(a.starts_at) - Date.parse(done[i + 1].starts_at)) / DAY)
  const avg = gaps.length ? Math.round(gaps.reduce((s, x) => s + x, 0) / gaps.length) : null
  const TabBtn = ({ id, label }) => <button type="button" role="tab" aria-selected={tab === id} className={'seg' + (tab === id ? ' on' : '')} onClick={() => navigate(id === 'proximos' ? '/agendamentos' : '/agendamentos?aba=' + id, true)}>{label} <span className="count">{groups[id].length}</span></button>
  const empty = { proximos: 'Você não tem agendamentos futuros.', concluidos: 'Seus atendimentos concluídos aparecem aqui.', cancelados: 'Nenhum agendamento cancelado.' }
  const last = load('gwb:ultima-loja', null) || all[0]?.store_slug
  return (
    <div className="wrap app">
      <h1 className="page-t">Agendamentos</h1>
      {done.length > 0 && (
        <div className="card freq">
          <div><span className="muted small">Último corte</span><strong>{agoText(daysAgo(done[0].starts_at))}</strong></div>
          <div><span className="muted small">Atendimentos</span><strong>{done.length}</strong></div>
          <div><span className="muted small">Frequência média</span><strong>{avg ? `a cada ${avg} dias` : '—'}</strong></div>
        </div>
      )}
      <div className="segs" role="tablist"><TabBtn id="proximos" label="Próximos" /><TabBtn id="concluidos" label="Histórico" /><TabBtn id="cancelados" label="Cancelados" /></div>
      {groups[tab].length === 0 ? (
        <div className="card center empty-state"><p className="muted">{empty[tab]}</p>{tab === 'proximos' && last && <Link className="btn btn-primary" to={'/' + last}>Novo agendamento</Link>}</div>
      ) : groups[tab].map((a) => <ApptCard key={a.id} a={a} onChanged={reload} onReview={setReview} />)}
      {review && <ReviewSheet a={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload() }} />}
    </div>
  )
}

function NeedLogin({ title }) {
  return (
    <div className="wrap app">
      <h1 className="page-t">{title}</h1>
      <div className="card center empty-state">
        <span className="empty-ic"><Icon name="lock" /></span>
        <p className="muted">Entre na sua conta para ver seus agendamentos, o histórico e avaliar seus atendimentos.</p>
        <Link className="btn btn-primary" to="/entrar">Entrar</Link><Link className="link" to="/cadastro">Criar conta</Link>
      </div>
    </div>
  )
}

export function Menu({ path }) {
  const { user, me } = useAuth()
  const sub = path.split('/')[2]
  if (sub === 'dados') return <MyData />
  if (sub === 'seguranca') return <Security />
  if (sub === 'preferencias') return <Prefs />
  const Item = ({ to, icon, label, onClick }) => (
    to ? <Link className="mitem" to={to}><Icon name={icon} /><span>{label}</span><Icon name="chevron" /></Link>
      : <button type="button" className="mitem" onClick={onClick}><Icon name={icon} /><span>{label}</span><Icon name="chevron" /></button>
  )
  return (
    <div className="wrap app">
      <h1 className="page-t">Menu</h1>
      {user ? (
        <div className="card me-card"><span className="logo md">{initials(me?.profile.full_name || user.email)}</span><span className="grow"><strong>{me?.profile.full_name || 'Sua conta'}</strong><span className="muted small">{user.email}</span></span></div>
      ) : (
        <div className="card center"><p className="muted">Entre para guardar seus agendamentos e histórico.</p><div className="row-btns"><Link className="btn btn-primary" to="/entrar">Entrar</Link><Link className="btn btn-ghost" to="/cadastro">Criar conta</Link></div></div>
      )}
      <nav className="menu card">
        <Item to="/" icon="home" label="Início" />
        <Item to="/agendamentos" icon="calendar" label="Meus agendamentos" />
        <Item to="/agendamentos?aba=concluidos" icon="history" label="Histórico" />
        {user && <Item to="/menu/dados" icon="user" label="Meus dados" />}
        {user && <Item to="/menu/seguranca" icon="shield" label="Segurança" />}
        <Item to="/menu/preferencias" icon="sliders" label="Preferências" />
      </nav>
      {user && <button type="button" className="btn btn-ghost btn-lg" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}><Icon name="logout" /> Sair da conta</button>}
      <Footer />
    </div>
  )
}

function SubPage({ title, children }) {
  return (
    <div className="wrap app">
      <header className="topbar"><Link className="round" to="/menu" aria-label="Voltar"><Icon name="back" /></Link><h1 className="top-title">{title}</h1><span className="round ghost" aria-hidden="true" /></header>
      {children}
    </div>
  )
}

function MyData() {
  const { user, me, setMe } = useAuth()
  const [name, setName] = useState(me?.profile.full_name || '')
  const [phone, setPhone] = useState(me?.profile.phone ? maskPhone(me.profile.phone) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (me) { setName((n) => n || me.profile.full_name || ''); setPhone((p) => p || (me.profile.phone ? maskPhone(me.profile.phone) : '')) } }, [me])
  if (!user) return <NeedLogin title="Meus dados" />
  async function save(e) {
    e.preventDefault(); setMsg(null)
    if (name.trim().length < 2) return setMsg({ type: 'error', text: 'Informe seu nome.' })
    if (phone && !phoneOk(phone)) return setMsg({ type: 'error', text: 'Informe um celular válido com DDD.' })
    setBusy(true)
    const { data, error } = await supabase.rpc('barber_me_save_profile', { p_full_name: name.trim(), p_phone: phone || null })
    setBusy(false)
    if (error) return setMsg({ type: 'error', text: meMsg(error) })
    setMe((m) => (m ? { ...m, profile: data } : m)); setMsg({ type: 'info', text: 'Dados salvos.' })
  }
  return (
    <SubPage title="Meus dados">
      <form className="card stack" onSubmit={save} noValidate>
        <label className="field"><span>Nome</span><input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" /></label>
        <label className="field"><span>WhatsApp</span><input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel-national" placeholder="(27) 99999-0000" /></label>
        <label className="field"><span>E-mail</span><input value={user.email || ''} readOnly disabled /></label>
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        <p className="muted small">Seu nome e WhatsApp já vêm preenchidos quando você agenda.</p>
      </form>
    </SubPage>
  )
}

function Security() {
  const { user } = useAuth()
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  if (!user) return <NeedLogin title="Segurança" />
  const google = (user.app_metadata?.providers || [user.app_metadata?.provider]).includes('google')
  async function change(e) {
    e.preventDefault(); setMsg(null)
    if (pw.length < 6) return setMsg({ type: 'error', text: 'A senha precisa ter pelo menos 6 caracteres.' })
    if (pw !== pw2) return setMsg({ type: 'error', text: 'As senhas não são iguais.' })
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg({ type: 'error', text: authMsg(error) })
    setPw(''); setPw2(''); setMsg({ type: 'info', text: 'Senha alterada.' })
  }
  return (
    <SubPage title="Segurança">
      <div className="card"><p className="muted small">Conta</p><p><strong>{user.email}</strong>{google ? ' · conectada com Google' : ''}</p></div>
      <form className="card stack" onSubmit={change} noValidate>
        <h2 className="h2">{google ? 'Criar uma senha' : 'Alterar senha'}</h2>
        <label className="field"><span>Nova senha</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <label className="field"><span>Repita a nova senha</span><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button>
      </form>
      <button className="btn btn-ghost btn-lg" onClick={async () => { await supabase.auth.signOut({ scope: 'global' }); navigate('/') }}><Icon name="logout" /> Sair de todos os aparelhos</button>
    </SubPage>
  )
}

function Prefs() {
  const { user } = useAuth()
  const [t, setT] = useState(getTheme())
  function pick(v) { setT(v); setTheme(v); if (user) supabase.rpc('barber_me_save_profile', { p_theme: v }) }
  const Opt = ({ v, label }) => <button type="button" role="radio" aria-checked={t === v} className={'opt' + (t === v ? ' on' : '')} onClick={() => pick(v)}><span className="opt-main"><strong>{label}</strong></span><span className="opt-side"><span className="tick" aria-hidden="true"><Icon name="check" /></span></span></button>
  return (
    <SubPage title="Preferências">
      <section className="card step"><h2 className="h2">Aparência</h2><div className="list" role="radiogroup" aria-label="Aparência"><Opt v="light" label="Modo claro" /><Opt v="dark" label="Modo escuro" /><Opt v="system" label="Igual ao aparelho" /></div></section>
      <section className="card step"><h2 className="h2">Idioma</h2><div className="list"><button type="button" className="opt on" aria-pressed="true"><span className="opt-main"><strong>Português (Brasil)</strong></span><span className="opt-side"><span className="tick" aria-hidden="true"><Icon name="check" /></span></span></button></div><p className="muted small">Outros idiomas em breve.</p></section>
    </SubPage>
  )
}

