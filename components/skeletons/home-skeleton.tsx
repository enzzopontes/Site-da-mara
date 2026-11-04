import { Skeleton } from "@/components/ui/skeleton"
import { ProductCardSkeleton } from "./product-card-skeleton"

export function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando página inicial"
      className="min-h-screen flex flex-col bg-stone-50 select-none"
    >
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] h-14 sm:h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="w-24 sm:w-32 h-3.5 rounded" />
            <Skeleton className="w-16 sm:w-20 h-2.5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </header>

      <main className="flex-1 pb-20">
        {/* Hero Capa */}
        <div className="w-full h-32 sm:h-52 md:h-64 relative bg-[#EAE5DF]">
          <Skeleton className="w-full h-full rounded-none" />
        </div>

        {/* Card Sobreposto do Restaurante */}
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="-mt-8 sm:-mt-16 relative z-10 bg-white rounded-2xl sm:rounded-3xl border border-[#ECE7E0] p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ring-white shadow-md shrink-0" />
              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 justify-center sm:justify-start">
                  <Skeleton className="h-6 w-36 sm:w-48 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-44 sm:w-64 rounded mx-auto sm:mx-0" />
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Categorias */}
          <section className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-3 border border-[#ECE7E0] flex flex-col items-center gap-2"
                >
                  <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </section>

          {/* Banners de Cupons */}
          <section className="mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="h-24 sm:h-28 rounded-2xl bg-white border border-[#ECE7E0] p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
              <div className="h-24 sm:h-28 rounded-2xl bg-white border border-[#ECE7E0] p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Seção Destaques */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
