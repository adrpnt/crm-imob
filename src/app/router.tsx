import { createBrowserRouter, type RouteObject } from 'react-router'

import { ErroDeRota } from '../components/feedback/ErroDeRota'
import { PaginaNaoEncontrada } from '../components/feedback/PaginaNaoEncontrada'
import { AppLayout } from '../components/layout/AppLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import App from './App'

/**
 * Árvore de rotas em data mode (AD-013).
 *
 * Nenhuma rota define `loader` ou `action`: os dados ficam inteiramente com o
 * TanStack Query, para que exista um único cache e um único ponto de
 * invalidação (PLAN §8). O que o roteador aporta aqui são layouts aninhados e
 * fronteiras de erro por rota.
 *
 * As rotas de `auth`, `clients` e `notes` entram como filhas destes dois
 * layouts.
 */
export const rotas: RouteObject[] = [
  {
    element: <AppLayout />,
    ErrorBoundary: ErroDeRota,
    children: [{ path: '/', element: <App /> }],
  },
  {
    element: <PublicLayout />,
    ErrorBoundary: ErroDeRota,
    children: [{ path: '*', element: <PaginaNaoEncontrada /> }],
  },
]

/** Criado fora da árvore React, como a API exige. */
export const router = createBrowserRouter(rotas)
