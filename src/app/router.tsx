import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'

import { ErroDeRota } from '../components/feedback/ErroDeRota'
import { PaginaNaoEncontrada } from '../components/feedback/PaginaNaoEncontrada'
import { AppLayout } from '../components/layout/AppLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import { MenuDoUsuario } from '../features/auth/components/MenuDoUsuario'
import { RotaProtegida } from '../features/auth/components/RotaProtegida'
import { RotaPublica } from '../features/auth/components/RotaPublica'
import { Cadastro } from '../features/auth/pages/Cadastro'
import { EsqueciSenha } from '../features/auth/pages/EsqueciSenha'
import { Login } from '../features/auth/pages/Login'
import { Perfil } from '../features/auth/pages/Perfil'
import { RedefinirSenha } from '../features/auth/pages/RedefinirSenha'
import App from './App'

/**
 * Árvore de rotas em data mode (AD-013).
 *
 * Nenhuma rota define `loader` ou `action`: os dados ficam inteiramente com o
 * TanStack Query, para que exista um único cache e um único ponto de
 * invalidação (PLAN §8). O que o roteador aporta aqui são layouts aninhados,
 * fronteiras de erro por rota e as duas guardas de sessão.
 *
 * A estrutura é guarda → layout → telas. A guarda fica por fora para decidir
 * antes de qualquer moldura ser desenhada: renderizar o cabeçalho e só então
 * descobrir que não há sessão produziria o piscar que o PLAN §6 proíbe.
 */
export const rotas: RouteObject[] = [
  {
    element: <RotaProtegida />,
    ErrorBoundary: ErroDeRota,
    children: [
      {
        element: <AppLayout acoesDoUsuario={<MenuDoUsuario />} />,
        children: [
          { path: '/', element: <Navigate to="/clients" replace /> },
          // Lugar-tenente até a feature `clients` assumir esta rota. Existe para
          // que o fluxo de autenticação feche de ponta a ponta: as guardas e o
          // login apontam para cá depois de entrar.
          { path: '/clients', element: <App /> },
          { path: '/profile', element: <Perfil /> },
        ],
      },
    ],
  },
  {
    element: <RotaPublica />,
    ErrorBoundary: ErroDeRota,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/signup', element: <Cadastro /> },
          { path: '/forgot-password', element: <EsqueciSenha /> },
          { path: '/reset-password', element: <RedefinirSenha /> },
        ],
      },
    ],
  },
  {
    element: <PublicLayout />,
    ErrorBoundary: ErroDeRota,
    children: [{ path: '*', element: <PaginaNaoEncontrada /> }],
  },
]

/** Criado fora da árvore React, como a API exige. */
export const router = createBrowserRouter(rotas)
