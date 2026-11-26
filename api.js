// GROWISE BARBER · chamadas às funções públicas (Edge Functions do Supabase).
// O endereço do projeto é público; a chave secreta fica só no servidor. O navegador nunca envia o id da loja.
import { SUPABASE_URL, supabase } from './supabase.js'
const BASE = SUPABASE_URL + '/functions/v1/'

export class ApiError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status }
}

async function call(fn, body, token) {
  let res
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token   // só no agendamento: o servidor valida e liga à conta do cliente
  try {
    res = await fetch(BASE + fn, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new ApiError('network', 'Sem conexão com a internet. Confira sua conexão e tente de novo.', 0)
  }
  let data = null
  try { data = await res.json() } catch { /* resposta sem JSON */ }
  if (!res.ok || !data || data.ok === false) {
    throw new ApiError(data?.error || 'http_' + res.status, data?.message || 'Não foi possível concluir agora. Tente novamente em instantes.', res.status)
  }
  return data
}

export const getPage = (slug) => call('barber-page', { slug })
export const getSlots = (slug, serviceId, professionalId, date) =>
  call('barber-slots', { slug, service_id: serviceId, professional_id: professionalId || null, date })
export async function book(payload) {
  let token = null
  try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch { /* sem login */ }
  return call('barber-book', payload, token)
}
export const lookup = (token) => call('barber-cancel', { token, action: 'lookup' })
export const cancel = (token) => call('barber-cancel', { token, action: 'cancel' })
