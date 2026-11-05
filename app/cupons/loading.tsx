import { CuponsSkeleton } from "@/components/coupons/cupons-skeleton"

export default function CuponsLoading() {
  return (
    <div className="min-h-screen bg-white max-w-xl mx-auto px-4 py-4">
      <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse mb-6 mx-auto" />
      <CuponsSkeleton count={4} />
    </div>
  )
}
