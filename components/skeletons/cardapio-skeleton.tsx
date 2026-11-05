import { Skeleton } from "@/components/ui/skeleton"
import { ProductCardSkeleton } from "./product-card-skeleton"

export function CardapioSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando cardápio"
      className="flex-1 bg-gray-50 pb-24 select-none min-h-screen"
    >
      {/* Bloco Sticky Flush: Busca + Categorias */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] shadow-xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-2.5 pb-2 flex flex-col gap-2">
          {/* Busca + Carrinho Skeleton */}
          <div className="flex items-center gap-2.5 w-full">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          </div>

          {/* Abas de Categorias Skeleton */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9.5 px-3.5 rounded-full border border-[#ECE7E0] bg-[#FDFBF7] flex items-center gap-2 shrink-0"
              >
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-14 h-3.5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-28 rounded" />
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
