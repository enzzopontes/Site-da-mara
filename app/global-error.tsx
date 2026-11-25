"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error]", error)
  }, [error])

  const content = (
    <main
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        background: "#F7F4EF",
        color: "#1F1B16",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Algo deu errado</h1>
      <p style={{ fontSize: 14, color: "#6B6157", margin: 0 }}>
        Não foi possível carregar esta página. Tente novamente.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: "#E3A008",
            color: "#fff",
            fontWeight: 800,
            border: 0,
            borderRadius: 12,
            padding: "14px 32px",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
        <a
          href="/"
          style={{
            border: "1px solid #E3A008",
            color: "#1F1B16",
            fontWeight: 800,
            borderRadius: 12,
            padding: "14px 24px",
            textDecoration: "none",
          }}
        >
          Voltar ao início
        </a>
      </div>
    </main>
  )

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{content}</body>
    </html>
  )
}
