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
import { EditarCliente } from '../features/clients/pages/EditarCliente'
import { FichaDoCliente } from '../features/clients/pages/FichaDoCliente'
import { ListaDeClientes } from '../features/clients/pages/ListaDeClientes'
import { NovoCliente } from '../features/clients/pages/NovoCliente'

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
          { path: '/clients', element: <ListaDeClientes /> },
          { path: '/clients/new', element: <NovoCliente /> },
          // A ficha concentra dados cadastrais e histórico de notas; a rota
          // `/clients/:id/notes` do PLAN §6 não existe, por decisão registrada
          // no `context.md`.
          { path: '/clients/:id', element: <FichaDoCliente /> },
          { path: '/clients/:id/edit', element: <EditarCliente /> },
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
