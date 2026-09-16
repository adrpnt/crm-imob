/**
 * Leitura do servidor de e-mail local que o Supabase CLI sobe.
 *
 * Permite que o teste de recuperação use o **link real** enviado ao consultor,
 * em vez de simular o fluxo. É o que torna verificável a configuração de
 * `site_url`: um endereço errado apareceria aqui.
 */
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

type Resumo = { ID: string; To: { Address: string }[] }

async function mensagens(): Promise<Resumo[]> {
  const resposta = await fetch(`${MAILPIT}/api/v1/messages?limit=200`)
  if (!resposta.ok) throw new Error(`Mailpit respondeu ${resposta.status}`)
  const corpo = (await resposta.json()) as { messages?: Resumo[] }
  return corpo.messages ?? []
}

/**
 * Espera a mensagem destinada a um endereço e devolve o primeiro link dela.
 *
 * Filtra por destinatário porque os testes rodam em paralelo e a caixa é
 * compartilhada: pegar "a mensagem mais recente" entregaria o link de outro
 * teste, e a falha seria intermitente e difícil de diagnosticar.
 */
export async function esperarLinkPara(email: string, tentativas = 40): Promise<string> {
  for (let i = 0; i < tentativas; i++) {
    const encontrada = (await mensagens()).find((m) =>
      m.To.some((destino) => destino.Address.toLowerCase() === email.toLowerCase()),
    )

    if (encontrada) {
      const resposta = await fetch(`${MAILPIT}/api/v1/message/${encontrada.ID}`)
      const corpo = (await resposta.json()) as { Text?: string; HTML?: string }
      const texto = corpo.Text || corpo.HTML || ''
      const link = texto.match(/https?:\/\/[^\s"'<>]+/)?.[0]
      if (link) return link.replaceAll('&amp;', '&')
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Nenhuma mensagem para ${email} chegou ao Mailpit em ${tentativas * 250}ms`)
}
