"use client"

import { useEffect, useRef, useState } from "react"

export interface KeyboardViewportState {
  keyboardOffset: number
  isKeyboardOpen: boolean
  viewportHeight: number
}

const INITIAL_STATE: KeyboardViewportState = {
  keyboardOffset: 0,
  isKeyboardOpen: false,
  viewportHeight: 0,
}

const OFFSET_THRESHOLD_PX = 60
const HEIGHT_DROP_THRESHOLD_PX = 120
const WIDTH_CHANGE_THRESHOLD_PX = 40
const SCROLL_DEBOUNCE_MS = 120

function isFormField(el: Element | null): el is HTMLElement {
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

export function useKeyboardViewport(): KeyboardViewportState {
  const [state, setState] = useState<KeyboardViewportState>(INITIAL_STATE)

  const stateRef = useRef<KeyboardViewportState>(INITIAL_STATE)
  const rafRef = useRef<number | null>(null)
  const scrollTimerRef = useRef<number | null>(null)
  const maxHeightRef = useRef<number>(0)
  const lastWidthRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const clearScrollTimer = () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current)
        scrollTimerRef.current = null
      }
    }

    const scheduleScrollIntoView = (target?: Element | null) => {
      const candidate = target ?? document.activeElement
      if (!isFormField(candidate)) return

      clearScrollTimer()
      scrollTimerRef.current = window.setTimeout(() => {
        scrollTimerRef.current = null
        const activeEl = isFormField(document.activeElement)
          ? document.activeElement
          : candidate
        if (
          activeEl.isConnected !== false &&
          isFormField(activeEl) &&
          typeof activeEl.scrollIntoView === "function"
        ) {
          activeEl.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          })
        }
      }, SCROLL_DEBOUNCE_MS)
    }

    const update = () => {
      const vv = window.visualViewport
      const layoutHeight = window.innerHeight
      const vvHeight = vv ? vv.height : layoutHeight
      const vvOffsetTop = vv ? vv.offsetTop : 0
      const currentWidth = window.innerWidth
      const isZoomed = vv ? vv.scale > 1.05 : false

      if (!isZoomed) {
        if (
          lastWidthRef.current === null ||
          Math.abs(currentWidth - lastWidthRef.current) > WIDTH_CHANGE_THRESHOLD_PX
        ) {
          lastWidthRef.current = currentWidth
          maxHeightRef.current = vvHeight
        } else {
          maxHeightRef.current = Math.max(maxHeightRef.current, vvHeight)
        }
      }

      const offsetBottom = vv
        ? Math.max(0, Math.round(layoutHeight - (vvHeight + vvOffsetTop)))
        : 0
      const heightDrop = Math.max(
        0,
        Math.round(maxHeightRef.current - vvHeight)
      )
      const isOpen =
        !isZoomed &&
        (offsetBottom > OFFSET_THRESHOLD_PX ||
          heightDrop > HEIGHT_DROP_THRESHOLD_PX)
      const nextOffset = isOpen ? offsetBottom : 0
      const nextViewportHeight = Math.round(vvHeight)

      const prevState = stateRef.current
      const becameOpen = !prevState.isKeyboardOpen && isOpen

      if (
        prevState.keyboardOffset !== nextOffset ||
        prevState.isKeyboardOpen !== isOpen ||
        prevState.viewportHeight !== nextViewportHeight
      ) {
        const nextState: KeyboardViewportState = {
          keyboardOffset: nextOffset,
          isKeyboardOpen: isOpen,
          viewportHeight: nextViewportHeight,
        }
        stateRef.current = nextState
        setState(nextState)
      }

      if (
        (becameOpen ||
          (isOpen && Math.abs(nextOffset - prevState.keyboardOffset) > 16)) &&
        isFormField(document.activeElement)
      ) {
        scheduleScrollIntoView(document.activeElement)
      }
    }

    const scheduleUpdate = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        update()
      })
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target =
        event.target instanceof Element ? event.target : document.activeElement
      if (isFormField(target)) {
        scheduleScrollIntoView(target)
      }
      scheduleUpdate()
    }

    const handleFocusOut = () => {
      clearScrollTimer()
      scheduleUpdate()
    }

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener("resize", scheduleUpdate)
      vv.addEventListener("scroll", scheduleUpdate)
    }
    window.addEventListener("resize", scheduleUpdate)
    document.addEventListener("focusin", handleFocusIn)
    document.addEventListener("focusout", handleFocusOut)

    update()

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      clearScrollTimer()
      if (vv) {
        vv.removeEventListener("resize", scheduleUpdate)
        vv.removeEventListener("scroll", scheduleUpdate)
      }
      window.removeEventListener("resize", scheduleUpdate)
      document.removeEventListener("focusin", handleFocusIn)
      document.removeEventListener("focusout", handleFocusOut)
    }
  }, [])

  return state
}
