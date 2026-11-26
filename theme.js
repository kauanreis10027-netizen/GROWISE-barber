// tema claro / escuro / do aparelho (guardado neste aparelho e, com login, na conta)
import { load, save } from './util.js'

export const getTheme = () => load('gwb:tema', 'dark')   // padrão: escuro (o cliente pode escolher claro ou "igual ao aparelho")
export function applyTheme(t = getTheme()) {
  const dark = t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1412' : '#f4f7f5')
}
export function setTheme(t) { save('gwb:tema', t); applyTheme(t) }
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme()) } catch { /* navegador antigo */ }
