import { Skeleton } from "@/components/ui/skeleton"

export function AddressCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="p-4 border-2 border-[#ECE7E0] rounded-xl bg-white space-y-2 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-4/5 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  )
}

export function AddressModalSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando endereços"
      className="space-y-3 py-2 select-none"
    >
      <AddressCardSkeleton />
      <AddressCardSkeleton />
    </div>
  )
}
