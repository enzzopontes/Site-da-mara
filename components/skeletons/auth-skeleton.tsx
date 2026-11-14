import { Skeleton } from "@/components/ui/skeleton"

export function AuthSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando autenticação"
      className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col select-none"
    >
      <div className="w-full max-w-md mx-auto px-5 pt-6 pb-10 flex-1 flex flex-col">
        <div className="mb-8">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>

        <div className="space-y-3 mb-8">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>

        <div className="mt-auto pt-8">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
