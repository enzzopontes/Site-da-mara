import { Skeleton } from "@/components/ui/skeleton"
import { ProductCardSkeleton } from "./product-card-skeleton"

export function CardapioSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando cardápio"
      className="flex-1 bg-gray-50 pb-20 select-none min-h-screen"
    >
      {/* Header Sticky Flush com Navegação de Categorias */}
      <div className="sticky top-14 sm:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9 px-3.5 rounded-full border border-[#ECE7E0] bg-[#FDFBF7] flex items-center gap-2 shrink-0"
              >
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-14 h-3.5 rounded" />
              </div>
            ))}
          </div>
          <div className="hidden sm:block shrink-0">
            <Skeleton className="h-9 w-64 rounded-full" />
          </div>
        </div>
      </div>

      {/* Busca Mobile */}
      <div className="sm:hidden px-4 pt-3">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Grid de Produtos */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
