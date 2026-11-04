import { Skeleton } from "@/components/ui/skeleton"

export function AdminLayoutSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando portal administrativo"
      className="min-h-screen flex bg-[#0F0D0A] text-white select-none"
    >
      {/* Sidebar Desktop Skeleton */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#1A1612] border-r border-[#2E2822] p-4 space-y-6 shrink-0">
        <div className="flex items-center gap-3 px-2 py-3 border-b border-[#2E2822]">
          <Skeleton className="w-10 h-10 rounded-xl bg-[#2E2822]" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24 rounded bg-[#2E2822]" />
            <Skeleton className="h-3 w-16 rounded bg-[#2E2822]" />
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#221D17]">
              <Skeleton className="w-5 h-5 rounded bg-[#2E2822]" />
              <Skeleton className="h-4 w-28 rounded bg-[#2E2822]" />
            </div>
          ))}
        </nav>

        <div className="pt-4 border-t border-[#2E2822]">
          <Skeleton className="h-10 w-full rounded-xl bg-[#2E2822]" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#14110E]">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#2E2822] bg-[#1A1612] px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-36 rounded-md bg-[#2E2822]" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full bg-[#2E2822]" />
            <Skeleton className="w-9 h-9 rounded-full bg-[#2E2822]" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 space-y-6">
          <AdminDashboardSkeleton />
        </main>
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando painel operacional"
      className="space-y-6 select-none"
    >
      {/* 4 Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#1A1612] border border-[#2E2822] space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 rounded bg-[#2E2822]" />
              <Skeleton className="w-8 h-8 rounded-lg bg-[#2E2822]" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg bg-[#2E2822]" />
            <Skeleton className="h-3 w-36 rounded bg-[#2E2822]" />
          </div>
        ))}
      </div>

      {/* Área Central / Tabela de Pedidos Recentes */}
      <div className="p-6 rounded-2xl bg-[#1A1612] border border-[#2E2822] space-y-4">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-6 w-40 rounded-md bg-[#2E2822]" />
          <Skeleton className="h-8 w-24 rounded-lg bg-[#2E2822]" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="py-3 border-b border-[#2E2822]/60 last:border-0 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg bg-[#2E2822]" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded bg-[#2E2822]" />
                <Skeleton className="h-3 w-48 rounded bg-[#2E2822]" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full bg-[#2E2822]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando dados da tabela"
      className="p-6 rounded-2xl bg-[#1A1612] border border-[#2E2822] space-y-4 select-none"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <Skeleton className="h-6 w-44 rounded-md bg-[#2E2822]" />
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-48 rounded-lg bg-[#2E2822]" />
          <Skeleton className="h-9 w-24 rounded-lg bg-[#2E2822]" />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="py-3.5 border-b border-[#2E2822]/60 last:border-0 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg bg-[#2E2822]" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded bg-[#2E2822]" />
                <Skeleton className="h-3 w-56 rounded bg-[#2E2822]" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20 rounded-full bg-[#2E2822]" />
              <Skeleton className="h-8 w-16 rounded-lg bg-[#2E2822]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
