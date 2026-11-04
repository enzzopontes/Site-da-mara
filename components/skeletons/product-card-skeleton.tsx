import { Skeleton } from "@/components/ui/skeleton"

export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-2xl overflow-hidden border border-[#ECE7E0] flex flex-col justify-between shadow-2xs select-none"
    >
      <div>
        <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F4EF]">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        <div className="p-2.5 sm:p-4 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="p-2.5 sm:p-4 pt-2.5 sm:pt-3 flex items-center justify-between gap-2 border-t border-[#ECE7E0]/70 mt-auto">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shrink-0" />
      </div>
    </div>
  )
}
