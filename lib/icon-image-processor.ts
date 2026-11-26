"use client"

import { MAX_CATEGORY_ICON_BYTES } from "@/lib/category-icons"

export interface IconImageBounds {
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  trimmed: boolean
  trimPercent: number
}

export interface AnalyzedIconImage {
  image: HTMLImageElement
  bounds: IconImageBounds
  fileName: string
  mimeType: string
}

export interface FrameIconOptions {
  zoomPercent: number
  useAutoTrim?: boolean
  outputSize?: number
  basePaddingRatio?: number
}

export const ICON_ALPHA_THRESHOLD = 12
export const ICON_ZOOM_MIN = 80
export const ICON_ZOOM_MAX = 150
export const ICON_ZOOM_DEFAULT = 100
export const ICON_EXPORT_SIZE = 512
const MAX_ANALYSIS_DIM = 1024

export function isRasterIconFile(file: File): boolean {
  return (
    file.type === "image/png" ||
    file.type === "image/webp" ||
    file.type === "image/jpeg"
  )
}

export function detectOpaqueBoundingBox(
  imageData: ImageData,
  alphaThreshold = ICON_ALPHA_THRESHOLD
): IconImageBounds {
  const { width, height, data } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3]
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width,
      height,
      originalWidth: width,
      originalHeight: height,
      trimmed: false,
      trimPercent: 0,
    }
  }

  const boxWidth = maxX - minX + 1
  const boxHeight = maxY - minY + 1
  const originalArea = Math.max(1, width * height)
  const trimmedArea = boxWidth * boxHeight
  const trimPercent = Math.max(
    0,
    Math.min(99, Math.round((1 - trimmedArea / originalArea) * 100))
  )
  const trimmed = minX > 0 || minY > 0 || boxWidth < width || boxHeight < height

  return {
    x: minX,
    y: minY,
    width: boxWidth,
    height: boxHeight,
    originalWidth: width,
    originalHeight: height,
    trimmed,
    trimPercent,
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error("Imagem inválida ou com dimensões zeradas."))
        return
      }
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Não foi possível decodificar a imagem selecionada."))
    }
    img.onabort = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Carregamento da imagem interrompido."))
    }
    img.src = objectUrl
  })
}

export async function analyzeIconImageFile(
  file: File,
  alphaThreshold = ICON_ALPHA_THRESHOLD
): Promise<AnalyzedIconImage> {
  const image = await loadImageFromFile(file)
  const natW = image.naturalWidth
  const natH = image.naturalHeight
  const scale = Math.min(1, MAX_ANALYSIS_DIM / Math.max(natW, natH))
  const cw = Math.max(1, Math.round(natW * scale))
  const ch = Math.max(1, Math.round(natH * scale))

  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch

  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      throw new Error("Contexto Canvas 2D indisponível neste navegador.")
    }

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(image, 0, 0, cw, ch)

    const imageData = ctx.getImageData(0, 0, cw, ch)
    const raw = detectOpaqueBoundingBox(imageData, alphaThreshold)

    let bounds: IconImageBounds = raw
    if (scale < 1) {
      const x = Math.max(0, Math.floor(raw.x / scale))
      const y = Math.max(0, Math.floor(raw.y / scale))
      const maxX = Math.min(natW - 1, Math.ceil((raw.x + raw.width) / scale) - 1)
      const maxY = Math.min(natH - 1, Math.ceil((raw.y + raw.height) / scale) - 1)
      const width = Math.max(1, maxX - x + 1)
      const height = Math.max(1, maxY - y + 1)
      const originalArea = Math.max(1, natW * natH)
      const trimmedArea = width * height
      const trimPercent = Math.max(
        0,
        Math.min(99, Math.round((1 - trimmedArea / originalArea) * 100))
      )
      const trimmed = x > 0 || y > 0 || width < natW || height < natH

      bounds = {
        x,
        y,
        width,
        height,
        originalWidth: natW,
        originalHeight: natH,
        trimmed,
        trimPercent,
      }
    }

    return {
      image,
      bounds,
      fileName: file.name,
      mimeType: file.type,
    }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export function renderFramedIconCanvas(
  analyzed: AnalyzedIconImage,
  options: FrameIconOptions
): HTMLCanvasElement {
  const outputSize = options.outputSize ?? ICON_EXPORT_SIZE
  const basePaddingRatio = options.basePaddingRatio ?? 0.05
  const useAutoTrim = options.useAutoTrim ?? true
  const clampedZoom = Math.min(
    ICON_ZOOM_MAX,
    Math.max(ICON_ZOOM_MIN, options.zoomPercent)
  )
  const zoomFactor = clampedZoom / 100

  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Contexto Canvas 2D indisponível neste navegador.")
  }

  ctx.clearRect(0, 0, outputSize, outputSize)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const sx = useAutoTrim ? analyzed.bounds.x : 0
  const sy = useAutoTrim ? analyzed.bounds.y : 0
  const sw = useAutoTrim ? analyzed.bounds.width : analyzed.bounds.originalWidth
  const sh = useAutoTrim ? analyzed.bounds.height : analyzed.bounds.originalHeight

  const usableBox = outputSize * (1 - basePaddingRatio * 2)
  const fitScale = Math.min(usableBox / Math.max(1, sw), usableBox / Math.max(1, sh))
  const finalScale = fitScale * zoomFactor

  const dw = sw * finalScale
  const dh = sh * finalScale
  const dx = (outputSize - dw) / 2
  const dy = (outputSize - dh) / 2

  ctx.drawImage(analyzed.image, sx, sy, sw, sh, dx, dy, dw, dh)
  return canvas
}

export function renderFramedIconPreviewDataUrl(
  analyzed: AnalyzedIconImage,
  options: FrameIconOptions
): string {
  const canvas = renderFramedIconCanvas(analyzed, {
    ...options,
    outputSize: options.outputSize ?? 256,
  })
  return canvas.toDataURL("image/png")
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/webp",
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar arquivo da imagem enquadrada."))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality
    )
  })
}

export async function exportFramedIconFile(
  analyzed: AnalyzedIconImage,
  options: FrameIconOptions
): Promise<File> {
  const canvas = renderFramedIconCanvas(analyzed, {
    ...options,
    outputSize: options.outputSize ?? ICON_EXPORT_SIZE,
  })

  const baseName = analyzed.fileName.replace(/\.[^/.]+$/, "") || "icone-3d"
  let blob = await canvasToBlob(canvas, "image/png")
  let finalName = `${baseName}-512.png`
  let finalMime = "image/png"

  if (blob.size > MAX_CATEGORY_ICON_BYTES) {
    blob = await canvasToBlob(canvas, "image/webp", 0.92)
    finalName = `${baseName}-512.webp`
    finalMime = "image/webp"
  }

  return new File([blob], finalName, { type: finalMime })
}
