#!/usr/bin/env node
/**
 * Garante que todo arquivo de teste no disco está realmente sendo executado.
 *
 * A terceira verificação independente mostrou que estreitar o glob em
 * `vitest.config.ts` apagava 22 dos 44 testes e `npm run test` continuava
 * saindo com zero. As contagens viviam no `tasks.md` como checklist manual, e
 * nada as impunha — ou seja, toda garantia desta feature podia ser desligada
 * por uma linha de configuração.
 *
 * Este script compara o que existe no disco com o que o Vitest descobre. Um
 * arquivo presente mas não descoberto é falha: ou o glob encolheu, ou o
 * arquivo está no lugar errado.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PROJETOS = [
  { nome: 'unit', raiz: 'src', sufixos: ['.test.ts', '.test.tsx'] },
  { nome: 'rls', raiz: 'tests/rls', sufixos: ['.test.ts'] },
]

function arquivosDeTeste(dir, sufixos, encontrados = []) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) arquivosDeTeste(caminho, sufixos, encontrados)
    else if (sufixos.some((s) => entrada.name.endsWith(s))) encontrados.push(resolve(caminho))
  }
  return encontrados
}

function descobertosPeloVitest(projeto) {
  const saida = execFileSync('npx', ['vitest', 'list', '--project', projeto, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return new Set(JSON.parse(saida).map((teste) => teste.file))
}

let falhou = false

for (const { nome, raiz, sufixos } of PROJETOS) {
  const noDisco = arquivosDeTeste(raiz, sufixos)
  const descobertos = descobertosPeloVitest(nome)
  const ignorados = noDisco.filter((arquivo) => !descobertos.has(arquivo))

  if (ignorados.length > 0) {
    falhou = true
    console.error(
      `\n✗ projeto "${nome}": ${ignorados.length} arquivo(s) de teste não são executados:`,
    )
    for (const arquivo of ignorados) console.error(`    ${arquivo}`)
    console.error(`  Confira o glob \`include\` do projeto "${nome}" em vitest.config.ts.`)
  } else {
    console.log(`✓ projeto "${nome}": ${noDisco.length} arquivo(s) de teste, todos executados`)
  }
}

process.exit(falhou ? 1 : 0)
