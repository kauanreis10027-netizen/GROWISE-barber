// conta do cliente: sessão do Supabase Auth + dados da conta (barber_me)
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { applyTheme, getTheme, setTheme } from './theme.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export const AUTH_ERRORS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Já existe uma conta com este e-mail. Entre ou recupere o acesso.',
  'Signups not allowed for this instance': 'O cadastro de clientes ainda não foi liberado. Fale com a barbearia.',
}
export function authMsg(e) {
  const m = e?.message || ''
  if (AUTH_ERRORS[m]) return AUTH_ERRORS[m]
  if (/password/i.test(m) && /6|short|least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate|too many|security purposes/i.test(m)) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'O login com Google ainda não foi ativado. Use e-mail e senha.'
  if (/fetch|network/i.test(m)) return 'Sem conexão com a internet. Tente de novo.'
  return 'Não foi possível concluir agora. Tente de novo.'
}
export const ME_ERRORS = { invalid_name: 'Informe seu nome (2 a 80 letras).', invalid_phone: 'Informe um telefone válido com DDD.', not_found: 'Agendamento não encontrado.',
  deadline_passed: 'O prazo para cancelar pelo app já passou. Fale com a barbearia.', not_cancellable: 'Este agendamento não pode mais ser cancelado.',
  already_reviewed: 'Este atendimento já foi avaliado.', not_completed: 'Só dá para avaliar atendimentos concluídos.', invalid_rating: 'Escolha de 1 a 5 estrelas.' }
export const meMsg = (e) => ME_ERRORS[(e?.message || '').trim()] || (/fetch|network/i.test(e?.message || '') ? 'Sem conexão com a internet. Tente de novo.' : 'Não foi possível concluir agora. Tente de novo.')

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)   // undefined = carregando
  const [me, setMe] = useState(null)
  const [meErr, setMeErr] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { setSession(s ?? null); if (ev === 'SIGNED_OUT') setMe(null) })
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    if (!session) { setMe(null); return null }
    setMeErr(null)
    const { data, error } = await supabase.rpc('barber_me')
    if (error) { setMeErr(error); return null }
    // telefone informado no cadastro: grava no perfil na primeira vez
    const pend = session.user?.user_metadata?.phone
    if (pend && !data.profile.phone) {
      const r = await supabase.rpc('barber_me_save_profile', { p_full_name: data.profile.full_name || session.user.user_metadata.full_name || null, p_phone: pend })
      if (!r.error) data.profile = r.data
    }
    if (data.profile.theme && data.profile.theme !== 'system' && getTheme() === 'system') setTheme(data.profile.theme)
    setMe(data); return data
  }, [session])

  useEffect(() => { if (session !== undefined) reload() }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { applyTheme() }, [])

  const value = { session, user: session?.user ?? null, me, meErr, reload, setMe }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
