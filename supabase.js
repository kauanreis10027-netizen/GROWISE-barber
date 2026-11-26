// GROWISE BARBER · conexão com o Supabase para o login do cliente e as funções da conta.
// A chave "publishable" é pública por natureza; a chave secreta fica só nas Edge Functions.
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://bhndakkaewlgwqaeijsi.supabase.co').replace(/\/$/, '')
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1fPhOJYTAUztB8TkB3lvLA_0HQWcNAW'

export const supabase = createClient(SUPABASE_URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'gwb-auth' },
})
