// navegação simples entre telas (sem recarregar a página)
import { useEffect, useState } from 'react'

export function navigate(to, replace = false) {
  if (to === window.location.pathname + window.location.search) return
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
export function useLocation() {
  const [loc, setLoc] = useState({ path: window.location.pathname, search: window.location.search })
  useEffect(() => {
    const on = () => setLoc({ path: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return loc
}
export const param = (search, k) => new URLSearchParams(search).get(k)
/** link interno: <a> de verdade (abre em nova aba com Ctrl), navegação sem recarregar no clique simples */
export function Link({ to, children, ...rest }) {
  return <a href={to} {...rest} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); rest.onClick?.(e); navigate(to) }}>{children}</a>
}
