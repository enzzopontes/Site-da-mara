import { Skeleton } from "@/components/ui/skeleton"

export function AuthSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando autenticação"
      className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 select-none"
    >
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7E0] shadow-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <Skeleton className="h-14 sm:h-16 w-full rounded-2xl" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-px flex-1 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
          <Skeleton className="h-px flex-1 rounded" />
        </div>

        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  )
}
