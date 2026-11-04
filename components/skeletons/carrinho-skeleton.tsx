import { Skeleton } from "@/components/ui/skeleton"

export function CarrinhoSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando carrinho"
      className="min-h-screen flex flex-col bg-gray-50 select-none"
    >
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] h-14 sm:h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="w-28 h-5 rounded-md" />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-44 rounded-lg mb-2" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Coluna da Esquerda: Lista de Itens */}
          <div className="lg:col-span-2 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-[#ECE7E0] flex gap-4 items-center"
              >
                <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-36 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-4 w-8 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coluna da Direita: Resumo do Pedido */}
          <div className="bg-white rounded-2xl p-5 border border-[#ECE7E0] space-y-4">
            <Skeleton className="h-6 w-36 rounded-md mb-2" />
            <div className="space-y-2.5 border-b border-[#ECE7E0] pb-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
              </div>
            </div>
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-6 w-20 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
