import type { ExportOptions } from './types'

export async function exportSvgImage(svg: string, options: ExportOptions = {}): Promise<Blob> {
  const { format = 'png', scale = 2, quality = 0.92 } = options
  if (!['png', 'jpeg', 'webp', 'svg'].includes(format))
    throw new Error(`不支持的图片格式：${format}`)
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 4)
    throw new Error('导出倍率必须在 0.1–4 之间')
  if (!Number.isFinite(quality) || quality < 0 || quality > 1)
    throw new Error('图片质量必须在 0–1 之间')
  if (format === 'svg' && !options.background)
    return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  if (typeof document === 'undefined')
    throw new Error('位图导出需要浏览器环境；服务端可使用 renderFishboneSvg')
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (parsed.querySelector('parsererror')) throw new Error('SVG 格式错误')
  const root = parsed.documentElement
  if (options.background)
    root.querySelector('[data-background]')?.setAttribute('fill', options.background)
  const source = new XMLSerializer().serializeToString(root)
  if (format === 'svg') return new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const width = Math.ceil(Number(root.getAttribute('width')) * scale)
  const height = Math.ceil(Number(root.getAttribute('height')) * scale)
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    width > 16384 ||
    height > 16384 ||
    width * height > 32_000_000
  )
    throw new Error('图片尺寸过大，请降低导出倍率或改用 SVG')
  await document.fonts?.ready
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('图片渲染失败'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持 Canvas 2D')
    if (format === 'jpeg' || options.background) {
      ctx.fillStyle = options.background ?? '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(image, 0, 0, width, height)
    const mime = `image/${format}`
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('图片编码失败'))),
        mime,
        quality
      )
    )
    if (blob.type !== mime)
      throw new Error(`当前浏览器不支持 ${format.toUpperCase()} 编码，请选择 PNG 或 SVG`)
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadSvgImage(svg: string, options: ExportOptions = {}): Promise<void> {
  if (typeof document === 'undefined') throw new Error('下载需要浏览器环境')
  const blob = await exportSvgImage(svg, options)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename =
    (options.filename ?? 'fishbone')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\.(png|jpe?g|webp|svg)$/i, '') || 'fishbone'
  link.href = url
  link.download = `${filename}.${options.format ?? 'png'}`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
