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
        <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2.5 pb-2.5 flex flex-col items-center gap-2.5">
          {/* Busca Skeleton Centralizada */}
          <div className="w-full max-w-2xl">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          {/* Abas de Categorias Skeleton (Centralizadas no Desktop) */}
          <div className="flex items-center md:justify-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 w-full">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9.5 md:h-10 px-3.5 md:px-4 rounded-full border border-[#ECE7E0] bg-[#FDFBF7] flex items-center gap-2 shrink-0"
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
