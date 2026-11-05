import confetti from "canvas-confetti"

export function triggerPixConfettiCannons() {
  const colors = [
    "#FFB800", // Dourado Batata Top
    "#16A34A", // Verde Aprovação
    "#E11D48", // Vermelho Vibrante
    "#F59E0B", // Âmbar Claro
    "#2563EB", // Azul Royal
    "#9333EA", // Roxo Celebração
    "#06B6D4", // Ciano Festivo
    "#84CC16", // Verde Limão
  ]

  // ─── Bomba 1: Disparo simultâneo nos dois cantos inferiores ───
  // Canhão esquerdo: sobe em direção ao centro/direita (60 graus)
  confetti({
    particleCount: 35,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 1 },
    colors,
    startVelocity: 55,
    gravity: 0.9,
    ticks: 200,
    zIndex: 999999,
  })

  // Canhão direito: sobe em direção ao centro/esquerda (120 graus)
  confetti({
    particleCount: 35,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 1 },
    colors,
    startVelocity: 55,
    gravity: 0.9,
    ticks: 200,
    zIndex: 999999,
  })

  // ─── Bomba 2: Segunda rajada após 300ms, depois finaliza ───
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 1 },
      colors,
      startVelocity: 60,
      gravity: 0.9,
      ticks: 220,
      zIndex: 999999,
    })

    confetti({
      particleCount: 40,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 1 },
      colors,
      startVelocity: 60,
      gravity: 0.9,
      ticks: 220,
      zIndex: 999999,
    })
  }, 300)
}
