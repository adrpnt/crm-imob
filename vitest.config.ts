import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
          // env.ts valida na importação. Sem estes valores, qualquer teste que
          // importe o módulo falharia no carregamento em vez de na asserção.
          env: {
            VITE_SUPABASE_URL: 'http://localhost:54321',
            VITE_SUPABASE_ANON_KEY: 'chave-de-teste',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          // A suíte de isolamento pelo cliente Supabase nasce em T15. Até lá a
          // permissividade fica no script test:rls, como --passWithNoTests:
          // dentro do bloco do projeto a opção é inerte, porque a checagem de
          // "nenhum arquivo encontrado" acontece no nível do runner.
          // T15 remove a flag assim que houver arquivos reais.
        },
      },
    ],
  },
})
