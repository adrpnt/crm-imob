import type { Session } from '@supabase/supabase-js'
import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '../../lib/query-client'
import { supabase } from '../../lib/supabase'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './use-auth'

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn() } },
}))

type Emissor = (evento: string, sessao: Session | null) => void

const cancelar = vi.fn()
let emitir: Emissor
let callbackRegistrado: Emissor

function prepararAssinatura() {
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(((cb: Emissor) => {
    callbackRegistrado = cb
    emitir = (evento, sessao) => act(() => cb(evento, sessao))
    return { data: { subscription: { unsubscribe: cancelar } } }
  }) as never)
}

const SESSAO = { access_token: 'a', user: { id: 'u1' } } as unknown as Session

function Sonda() {
  const auth = useAuth()
  return (
    <span data-testid="estado">
      {auth.estado}|{auth.sessao?.user.id ?? 'sem-sessao'}|{String(auth.emRecuperacao)}
    </span>
  )
}

function renderizar() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  )
}

const lido = () => screen.getByTestId('estado').textContent

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  prepararAssinatura()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('começa em carregando, sem sessão', () => {
    renderizar()
    expect(lido()).toBe('carregando|sem-sessao|false')
  })

  it('resolve para anonimo quando INITIAL_SESSION chega vazio', () => {
    renderizar()
    emitir('INITIAL_SESSION', null)
    expect(lido()).toBe('anonimo|sem-sessao|false')
  })

  it('resolve para autenticado quando INITIAL_SESSION traz sessão', () => {
    renderizar()
    emitir('INITIAL_SESSION', SESSAO)
    expect(lido()).toBe('autenticado|u1|false')
  })

  it('marca a recuperação ao receber PASSWORD_RECOVERY', () => {
    renderizar()
    emitir('PASSWORD_RECOVERY', SESSAO)
    expect(lido()).toBe('autenticado|u1|true')
  })

  it('preserva a marca de recuperação quando o token é renovado', () => {
    // Durante a redefinição o token pode ser renovado. Perder a marca aqui
    // expulsaria o consultor da própria tela de redefinir senha.
    renderizar()
    emitir('PASSWORD_RECOVERY', SESSAO)
    emitir('TOKEN_REFRESHED', SESSAO)
    expect(lido()).toBe('autenticado|u1|true')
  })

  it('derruba a marca quando o usuário é atualizado, que é o fim da redefinição', () => {
    renderizar()
    emitir('PASSWORD_RECOVERY', SESSAO)
    emitir('USER_UPDATED', SESSAO)
    expect(lido()).toBe('autenticado|u1|false')
  })

  it('volta a anonimo e limpa o cache ao sair', () => {
    const limpar = vi.spyOn(queryClient, 'clear')
    renderizar()
    emitir('INITIAL_SESSION', SESSAO)
    emitir('SIGNED_OUT', null)

    expect(lido()).toBe('anonimo|sem-sessao|false')
    expect(limpar).toHaveBeenCalled()
  })

  it('resolve para anonimo se INITIAL_SESSION nunca chegar', () => {
    // Acontece quando o armazenamento local está bloqueado. Sem o limite, a
    // guarda ficaria presa em carregando e a tela em branco para sempre.
    renderizar()
    expect(lido()).toBe('carregando|sem-sessao|false')
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(lido()).toBe('anonimo|sem-sessao|false')
  })

  it('não sobrescreve um estado já resolvido quando o limite dispara', () => {
    renderizar()
    emitir('INITIAL_SESSION', SESSAO)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(lido()).toBe('autenticado|u1|false')
  })

  it('cancela a assinatura ao desmontar', () => {
    const { unmount } = renderizar()
    unmount()
    expect(cancelar).toHaveBeenCalledOnce()
  })

  // O callback precisa ser síncrono: o supabase-js aguarda os handlers em
  // ordem, e uma chamada assíncrona aqui pode travar todas as chamadas
  // seguintes do cliente. Este teste falha se alguém o tornar `async`.
  it('registra um callback síncrono, que não devolve promessa', () => {
    renderizar()
    expect(callbackRegistrado.constructor.name).not.toBe('AsyncFunction')
    const retorno = callbackRegistrado('INITIAL_SESSION', null)
    expect(retorno).toBeUndefined()
  })
})

describe('useAuth', () => {
  it('falha alto fora do provedor, em vez de devolver nulo', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Sonda />)).toThrowError(/dentro de <AuthProvider>/)
  })
})
