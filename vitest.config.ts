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
        },
      },
      {
        extends: true,
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          // A suíte de isolamento pelo cliente Supabase nasce em T15. Até lá o
          // projeto existe e sai com zero em vez de derrubar o gate das tarefas
          // de banco. A contagem de testes exigida por T15 e T16 é o que impede
          // que esta permissividade esconda uma suíte apagada depois.
          passWithNoTests: true,
        },
      },
    ],
  },
})
