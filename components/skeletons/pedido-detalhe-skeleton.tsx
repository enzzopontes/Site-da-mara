import { Skeleton } from "@/components/ui/skeleton"

export function PedidoDetalheSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando detalhes do pedido"
      className="min-h-screen flex flex-col bg-gray-50 select-none pb-24"
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#ECE7E0] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-32 h-6 rounded-md" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Card Status iFood */}
        <div className="bg-white rounded-3xl p-6 border border-[#ECE7E0] shadow-2xs space-y-5">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-56 rounded" />
            </div>
          </div>

          {/* Stepper de 4 Etapas */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-7 h-7 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex justify-between text-xs pt-1">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        </div>

        {/* Card de Itens */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7E0] space-y-3">
          <Skeleton className="h-5 w-32 rounded mb-2" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[#ECE7E0]/60 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-[#ECE7E0]">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
        </div>

        {/* Grid de Endereço & Pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-[#ECE7E0] space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#ECE7E0] space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>

        {/* Botão de Suporte */}
        <Skeleton className="h-14 w-full rounded-2xl" />
      </main>
    </div>
  )
}
