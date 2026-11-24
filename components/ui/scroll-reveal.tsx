"use client"

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react"

/**
 * Entrada em cascata de cima para baixo (scroll reveal), disparo único.
 * - Anima apenas `transform` e `opacity` (CSS em globals.css, atributo data-reveal).
 * - Um único IntersectionObserver compartilhado; itens revelados no mesmo lote
 *   recebem stagger de 60ms (teto de 300ms).
 * - SSR: HTML nasce em "pending" (igual ao 1º render do cliente = sem mismatch).
 *   Failsafe CSS (sem JS / hidratação lenta) e failsafe JS (observer falho).
 */

type RevealState = "pending" | "armed" | "shown"

export interface ScrollRevealProps {
  children: ReactNode
  /** Atraso extra (ms) somado ao stagger automático. */
  delayMs?: number
  /** Deslocamento inicial no eixo Y (px, sobe de -distancePx até 0). */
  distancePx?: number
  durationMs?: number
  className?: string
  as?: ElementType
}

const STAGGER_MS = 60
const MAX_DELAY_MS = 300
const FAILSAFE_MS = 1500

type RevealCallback = (batchDelayMs: number) => void

const callbacks = new WeakMap<Element, RevealCallback>()
let sharedObserver: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver

  sharedObserver = new IntersectionObserver(
    (entries) => {
      // Já passou do topo (ex.: scroll restaurado / âncora): revela sem esperar.
      const passed = entries.filter((e) => !e.isIntersecting && e.boundingClientRect.top < 0)
      const entering = entries
        .filter((e) => e.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        )

      passed.forEach((e) => {
        sharedObserver?.unobserve(e.target)
        callbacks.get(e.target)?.(0)
      })
      entering.forEach((e, i) => {
        sharedObserver?.unobserve(e.target)
        callbacks.get(e.target)?.(Math.min(i * STAGGER_MS, MAX_DELAY_MS))
      })
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  )
  return sharedObserver
}

export function ScrollReveal({
  children,
  delayMs = 0,
  distancePx = 18,
  durationMs = 500,
  className,
  as = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null)
  const revealedRef = useRef(false)
  const [state, setState] = useState<RevealState>("pending")
  const [delay, setDelay] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || revealedRef.current) return

    const reveal = (batchDelay: number) => {
      if (revealedRef.current) return
      revealedRef.current = true
      setDelay(Math.min(batchDelay + delayMs, MAX_DELAY_MS))
      setState("shown")
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      reveal(0)
      return
    }

    setState("armed")
    const observer = getObserver()
    callbacks.set(el, reveal)
    observer.observe(el)

    // Failsafe: observer que não dispara (resize rápido, display:none → block, etc.).
    const timer = window.setTimeout(() => {
      if (revealedRef.current) return
      const rect = el.getBoundingClientRect()
      const hasZeroLayout = rect.width === 0 && rect.height === 0
      if (hasZeroLayout || rect.top < window.innerHeight) {
        observer.unobserve(el)
        reveal(0)
      }
    }, FAILSAFE_MS)

    return () => {
      window.clearTimeout(timer)
      observer.unobserve(el)
      callbacks.delete(el)
    }
  }, [delayMs])

  return createElement(
    as,
    {
      ref,
      className,
      "data-reveal": state,
      style: {
        "--sr-y": `${-distancePx}px`,
        "--sr-dur": `${durationMs}ms`,
        "--sr-delay": `${delay}ms`,
      } as CSSProperties,
    },
    children,
  )
}
