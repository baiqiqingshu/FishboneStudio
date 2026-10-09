export interface FishboneNode {
  id?: string
  label: string
  children?: FishboneNode[]
}
export type FishbonePreset = 'ocean' | 'classic' | 'forest' | 'sunset' | 'midnight'
export interface FishboneTheme {
  background: string
  spineColor: string
  branchColors: string[]
  textColor: string
  mutedColor: string
  headBackground: string
  headTextColor: string
  fontFamily: string
  fontSize: number
  lineWidth: number
  nodeRadius: number
}
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg'
export interface ExportOptions {
  format?: ImageFormat
  filename?: string
  /** Raster multiplier (0.1–4), SVG remains vector. */
  scale?: number
  /** Lossy image quality (0–1). */
  quality?: number
  background?: string
}
export interface FishboneHandle {
  exportImage: (options?: ExportOptions) => Promise<Blob>
  download: (options?: ExportOptions) => Promise<void>
  getSvg: () => string
}
