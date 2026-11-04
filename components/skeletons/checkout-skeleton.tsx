import { Skeleton } from "@/components/ui/skeleton"

export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando checkout"
      className="min-h-screen flex flex-col bg-gray-50 select-none pb-24"
    >
      {/* Header Sticky com Stepper */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-28 h-5 rounded-md" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <div className="max-w-2xl mx-auto mt-2.5">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Card Itens da Sacola */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE7E0] space-y-3">
          <div className="flex justify-between items-center mb-1">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[#ECE7E0]/60 last:border-0">
              <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded shrink-0" />
            </div>
          ))}
        </div>

        {/* Card Cupom */}
        <div className="bg-white rounded-2xl p-4 border border-[#ECE7E0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
        </div>

        {/* Card Endereço de Entrega */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE7E0] space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex items-start gap-3 pt-1">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-3 w-3/5 rounded" />
            </div>
          </div>
        </div>

        {/* Card Forma de Pagamento */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE7E0] space-y-3">
          <Skeleton className="h-5 w-40 rounded mb-2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl border border-[#ECE7E0] p-3 flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="h-16 rounded-xl border border-[#ECE7E0] p-3 flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>
        </div>

        {/* Card Resumo de Valores */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE7E0] space-y-2.5">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#ECE7E0]">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
        </div>
      </main>

      {/* Barra Fixa Inferior */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#ECE7E0] p-4 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <Skeleton className="h-14 w-48 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
