import { Skeleton } from "@/components/ui/skeleton"

export function PedidosSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando pedidos"
      className="min-h-screen flex flex-col bg-gray-50 select-none pb-24 lg:pb-8"
    >
      {/* Top Bar Mobile */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#ECE7E0] px-4 py-4 flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-36 h-6 rounded-md" />
      </div>

      {/* Título Desktop */}
      <div className="hidden lg:block container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-48 rounded-lg mb-2" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Lista de Pedidos */}
      <main className="container mx-auto px-4 max-w-2xl space-y-4 pt-4 lg:pt-0">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#ECE7E0] p-4 sm:p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <div className="py-2 border-y border-[#ECE7E0]/70 space-y-1.5">
              <Skeleton className="h-3.5 w-4/5 rounded" />
              <Skeleton className="h-3.5 w-3/5 rounded" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-xl" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
