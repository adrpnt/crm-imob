/**
 * Tela exibida quando algo falha de forma não tratada.
 *
 * Compartilhada pelas duas fronteiras: a de classe, que cobre o que acontece
 * acima do roteador, e a de rota, que cobre o que acontece dentro dele.
 */
export function TelaDeErro() {
  return (
    <div
      role="alert"
      className="mx-auto max-w-md rounded-surface border border-graphite-700 bg-graphite-800 p-6 text-center"
    >
      <h1 className="text-xl">Algo deu errado</h1>
      <p className="mt-2 text-silver-600">
        A falha foi registrada. Recarregue a página para continuar.
      </p>
      <button
        type="button"
        onClick={() => globalThis.location.reload()}
        className="mt-4 rounded-control bg-rocket-500 px-4 py-2 font-medium text-graphite-950"
      >
        Recarregar
      </button>
    </div>
  )
}
