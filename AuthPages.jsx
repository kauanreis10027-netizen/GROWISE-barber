// Entrar, criar conta, recuperar acesso e nova senha (login do cliente; separado do CONTROL)
import { useState } from 'react'
import { supabase } from './supabase.js'
import { authMsg, useAuth } from './auth.jsx'
import { Link, navigate, param } from './router.jsx'
import { maskPhone, phoneOk } from './util.js'
import { Footer, Icon, Notice } from './ui.jsx'

const back = (search) => { const v = param(search, 'volta'); return v && /^\/[a-z0-9/?=&-]*$/i.test(v) ? v : '/' }

function Shell({ title, sub, children }) {
  return (
    <div className="wrap app auth">
      <header className="topbar"><button type="button" className="round" aria-label="Voltar" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}><Icon name="back" /></button><span /><span className="round ghost" aria-hidden="true" /></header>
      <div className="auth-head"><span className="brand-mark"><Icon name="scissors" /></span><h1 className="h1">{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {children}
      <Footer />
    </div>
  )
}

function GoogleBtn({ search }) {
  const [err, setErr] = useState(null)
  async function go() {
    setErr(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + back(search) } })
    if (error) setErr(authMsg(error))
  }
  return (<><button type="button" className="btn btn-ghost btn-lg google" onClick={go}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" /></svg> Continuar com Google</button>{err && <Notice type="error">{err}</Notice>}</>)
}

export function Login({ search }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null)
  async function submit(e) {
    e.preventDefault(); setErr(null)
    if (!email.trim() || !pw) return setErr('Informe e-mail e senha.')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) return setErr(authMsg(error))
    navigate(back(search), true)
  }
  return (
    <Shell title="Entrar" sub="Acesse seus agendamentos e seu histórico.">
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></label>
        <label className="field"><span>Senha</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
        {err && <Notice type="error">{err}</Notice>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <Link className="link center" to="/recuperar">Esqueci minha senha</Link>
      </form>
      <div className="or"><span>ou</span></div>
      <GoogleBtn search={search} />
      <p className="center muted">Ainda não tem conta? <Link className="link" to={'/cadastro' + (search || '')}>Criar conta</Link></p>
    </Shell>
  )
}

export function Signup({ search }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', pw: '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [sent, setSent] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }))
  async function submit(e) {
    e.preventDefault(); setErr(null)
    if (f.name.trim().length < 2) return setErr('Informe seu nome.')
    if (!phoneOk(f.phone)) return setErr('Informe um celular válido com DDD.')
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Informe um e-mail válido.')
    if (f.pw.length < 6) return setErr('A senha precisa ter pelo menos 6 caracteres.')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.pw, options: { data: { full_name: f.name.trim(), phone: f.phone, app: 'barber' }, emailRedirectTo: window.location.origin + back(search) } })
    setBusy(false)
    if (error) return setErr(authMsg(error))
    if (data.session) navigate(back(search), true); else setSent(true)
  }
  if (sent) return (
    <Shell title="Confirme seu e-mail" sub={`Enviamos um link para ${f.email.trim()}. Abra o e-mail e toque no link para ativar sua conta.`}>
      <Link className="btn btn-primary btn-lg" to="/entrar">Já confirmei, entrar</Link>
    </Shell>
  )
  return (
    <Shell title="Criar conta" sub="Leva menos de um minuto.">
      <GoogleBtn search={search} />
      <div className="or"><span>ou com e-mail</span></div>
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field"><span>Nome</span><input value={f.name} onChange={set('name')} autoComplete="name" maxLength={80} /></label>
        <label className="field"><span>WhatsApp</span><input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel-national" placeholder="(27) 99999-0000" /></label>
        <label className="field"><span>E-mail</span><input type="email" value={f.email} onChange={set('email')} autoComplete="email" inputMode="email" /></label>
        <label className="field"><span>Senha</span><input type="password" value={f.pw} onChange={set('pw')} autoComplete="new-password" placeholder="Mínimo 6 caracteres" /></label>
        {err && <Notice type="error">{err}</Notice>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <p className="center muted">Já tem conta? <Link className="link" to={'/entrar' + (search || '')}>Entrar</Link></p>
    </Shell>
  )
}

export function Recover() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  async function submit(e) {
    e.preventDefault(); setMsg(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ type: 'error', text: 'Informe um e-mail válido.' })
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/nova-senha' })
    setBusy(false)
    setMsg(error ? { type: 'error', text: authMsg(error) } : { type: 'info', text: 'Se o e-mail tiver conta, enviamos um link para criar uma nova senha.' })
  }
  return (
    <Shell title="Recuperar acesso" sub="Enviamos um link para você criar uma nova senha.">
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></label>
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
      </form>
    </Shell>
  )
}

export function NewPassword() {
  const { user } = useAuth()
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null)
  async function submit(e) {
    e.preventDefault(); setErr(null)
    if (pw.length < 6) return setErr('A senha precisa ter pelo menos 6 caracteres.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(authMsg(error))
    navigate('/', true)
  }
  if (!user) return <Shell title="Link expirado" sub="Peça um novo link para criar sua senha."><Link className="btn btn-primary btn-lg" to="/recuperar">Pedir novo link</Link></Shell>
  return (
    <Shell title="Nova senha">
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field"><span>Nova senha</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" /></label>
        {err && <Notice type="error">{err}</Notice>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e entrar'}</button>
      </form>
    </Shell>
  )
}
