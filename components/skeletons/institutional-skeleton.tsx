import { Skeleton } from "@/components/ui/skeleton"

export function LegalPageSkeleton({ title = "Carregando documento" }: { title?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
      className="min-h-screen bg-[#F7F4EF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 select-none"
    >
      <div className="max-w-3xl w-full mx-auto mb-4">
        <Skeleton className="h-6 w-36 rounded-md" />
      </div>

      <main className="w-full max-w-3xl mx-auto my-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9] p-6 sm:p-12 space-y-6">
          <div className="text-center pb-6 border-b border-[#E8E2D9] space-y-3">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-64 rounded-lg mx-auto" />
            <Skeleton className="h-4 w-48 rounded mx-auto" />
          </div>

          <div className="space-y-4 pt-2">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/6 rounded" />
          </div>

          <div className="space-y-4 pt-4">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
      </main>
    </div>
  )
}

export function SobreSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando sobre nós"
      className="min-h-screen flex flex-col bg-white select-none"
    >
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] h-14 sm:h-16 px-4 flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-24 h-5 rounded" />
      </header>

      <main className="flex-1">
        <div className="py-16 md:py-24 bg-stone-100 flex flex-col items-center text-center px-4 space-y-4">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-10 sm:h-14 w-80 sm:w-96 rounded-xl" />
          <Skeleton className="h-5 w-72 sm:w-80 rounded" />
        </div>

        <div className="container mx-auto px-4 max-w-5xl py-12 space-y-6">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>
      </main>
    </div>
  )
}

export function ContatoSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando contato"
      className="min-h-screen flex flex-col bg-white select-none"
    >
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECE7E0] h-14 sm:h-16 px-4 flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-24 h-5 rounded" />
      </header>

      <main className="flex-1">
        <div className="py-12 bg-gray-50 border-b border-gray-100 text-center px-4 space-y-3">
          <Skeleton className="h-10 w-72 mx-auto rounded-xl" />
          <Skeleton className="h-5 w-80 mx-auto rounded" />
        </div>

        <div className="container mx-auto px-4 max-w-6xl py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border-2 border-stone-200 rounded-3xl p-8 space-y-4">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-8 w-64 rounded-lg" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-14 w-56 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <div className="bg-white border rounded-2xl p-6 space-y-3">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
