import { Skeleton } from "@/components/ui/skeleton"

export function MeusDadosSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando dados cadastrais"
      className="min-h-screen flex flex-col bg-gray-50 select-none pb-24"
    >
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-36 h-6 rounded-md" />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-xl space-y-4">
        <div className="bg-white rounded-2xl p-6 border border-[#ECE7E0] space-y-4 shadow-2xs">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#ECE7E0] space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>
      </main>
    </div>
  )
}
