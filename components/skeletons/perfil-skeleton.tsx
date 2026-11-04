import { Skeleton } from "@/components/ui/skeleton"

export function PerfilSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando perfil"
      className="min-h-screen flex flex-col bg-white md:bg-[#F7F5F0] antialiased select-none pb-24 lg:pb-12"
    >
      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] h-14 sm:h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-24 h-5 rounded-md" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full md:py-8 md:px-4">
        <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-[#ECE7E0] overflow-hidden px-5 py-6 space-y-6">
          {/* Header Profile Info */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-52 rounded" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
          </div>

          {/* Card de Cupons de Destaque */}
          <div className="h-24 w-full rounded-2xl bg-[#F7F5F0] border border-[#ECE7E0] p-4 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-44 rounded" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>

          {/* Linhas de Acordeão */}
          <div className="space-y-4 pt-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="py-3 border-b border-[#ECE7E0]/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
