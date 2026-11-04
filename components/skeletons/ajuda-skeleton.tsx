import { Skeleton } from "@/components/ui/skeleton"

export function AjudaSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando central de ajuda"
      className="min-h-screen flex flex-col bg-[#F7F5F0] select-none pb-24 lg:pb-8"
    >
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] px-4 py-4">
        <div className="container mx-auto max-w-2xl flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-2xl space-y-5">
          {/* Grid de Ações Rápidas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-2xl bg-white border border-[#ECE7E0] p-3 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            </div>
            <div className="h-20 rounded-2xl bg-white border border-[#ECE7E0] p-3 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            </div>
          </div>

          {/* Dúvidas Frequentes */}
          <div className="bg-white rounded-2xl border border-[#ECE7E0] p-5 space-y-4">
            <Skeleton className="h-5 w-44 rounded-md mb-2" />
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="py-3 border-b border-[#ECE7E0]/60 last:border-0 flex justify-between items-center"
              >
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            ))}
          </div>

          {/* Card WhatsApp */}
          <div className="bg-white rounded-2xl border border-[#ECE7E0] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
