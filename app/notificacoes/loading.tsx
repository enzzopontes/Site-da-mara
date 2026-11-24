export default function NotificacoesLoading() {
  return (
    <div className="min-h-screen bg-white md:bg-[#F7F4EF] antialiased">
      <div className="max-w-2xl mx-auto md:py-8 md:px-4">
        <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-[#ECE7E0] min-h-screen md:min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          {/* Header skeleton */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-[#F5F2ED] animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#F5F2ED]" />
            <div className="h-4 w-32 rounded bg-[#ECE7E0]" />
            <div className="w-10 h-10" />
          </header>

          {/* 5 notification row placeholders */}
          <div className="divide-y divide-[#F5F2ED]" aria-busy="true" aria-label="Carregando notificações">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 px-4 py-4 bg-white animate-pulse"
              >
                <div className="w-11 h-11 rounded-full bg-[#ECE7E0] shrink-0" />
                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-3.5 w-3/5 rounded bg-[#ECE7E0]" />
                    <div className="h-3 w-10 rounded bg-[#F5F2ED] shrink-0" />
                  </div>
                  <div className="h-3 w-11/12 rounded bg-[#F5F2ED]" />
                  <div className="h-3 w-2/3 rounded bg-[#F5F2ED]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
