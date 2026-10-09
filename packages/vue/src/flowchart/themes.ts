import { fishboneThemes } from '../themes'
import type {
  FlowchartPreset,
  FlowchartTheme,
  FlowchartThemeOverrides,
  FlowchartShapeStyle,
  FlowchartLayoutOptions
} from './types'

const shape = (
  fill: string,
  stroke: string,
  textColor: string,
  fontFamily: string
): FlowchartShapeStyle => ({
  fill,
  stroke,
  textColor,
  fontFamily,
  fontSize: 15,
  fontWeight: 500,
  lineWidth: 1.5,
  radius: 10
})
export const flowchartThemes = Object.fromEntries(
  Object.entries(fishboneThemes).map(([key, source]) => {
    const dark = key === 'midnight'
    const palettes: Record<string, string[]> = {
      ocean: ['#f0f9f7', '#a3d5cb', '#246f65', '#fff7e6', '#e3bd72', '#886225', '#f1f5fa'],
      classic: ['#ffffff', '#a1a1aa', '#3f3f46', '#f4f4f5', '#71717a', '#3f3f46', '#fafafa'],
      forest: ['#f1f7ed', '#a6c292', '#49683d', '#faf6df', '#c4b174', '#756435', '#f5f9f0'],
      sunset: ['#fff1e9', '#e9b7a0', '#99634e', '#fff5d9', '#e8c581', '#9c7937', '#fff8f3'],
      midnight: ['#263d46', '#54857e', '#d7f7ed', '#4a402c', '#ae9667', '#ffe9b1', '#202c3a']
    }
    const p = palettes[key]!
    return [
      key,
      {
        background: source.background,
        fontFamily: source.fontFamily,
        fontSize: 15,
        activity: shape(p[0]!, p[1]!, p[2]!, source.fontFamily),
        decision: shape(p[3]!, p[4]!, p[5]!, source.fontFamily),
        start: shape(
          dark ? '#1c6f61' : '#148b78',
          dark ? '#6cc9ad' : '#148b78',
          '#ffffff',
          source.fontFamily
        ),
        end: shape(
          dark ? '#38485c' : '#edf1f6',
          dark ? '#8393a8' : '#b9c6d5',
          dark ? '#dfe7f0' : '#526477',
          source.fontFamily
        ),
        region: {
          fill: p[6]!,
          stroke: dark ? '#42546b' : '#dfe8ed',
          titleColor: source.textColor,
          textColor: source.mutedColor
        },
        edge: {
          stroke: dark ? '#9eb5c9' : '#8a9eaf',
          textColor: dark ? '#ccdce9' : '#677d90',
          lineWidth: 1.6,
          dashed: false,
          arrow: true
        }
      } satisfies FlowchartTheme
    ]
  })
) as Record<FlowchartPreset, FlowchartTheme>

export function validateStyle(style: unknown, kind: 'shape' | 'region' | 'edge'): void {
  if (!style || typeof style !== 'object' || Array.isArray(style)) throw new Error('样式必须为对象')
  const strings =
    kind === 'shape'
      ? ['fill', 'stroke', 'textColor', 'fontFamily']
      : kind === 'region'
        ? ['fill', 'stroke', 'titleColor', 'textColor']
        : ['stroke', 'textColor']
  const ranges: Record<string, [number, number]> =
    kind === 'shape'
      ? { fontSize: [10, 32], fontWeight: [100, 900], lineWidth: [0.5, 8], radius: [0, 40] }
      : kind === 'edge'
        ? { lineWidth: [0.5, 8] }
        : {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (strings.includes(key)) {
      if (typeof value !== 'string' || !value.trim() || value.length > 200)
        throw new Error(`${key} 必须是长度不超过 200 的非空字符串`)
    } else if (key in ranges) {
      const [min, max] = ranges[key]!
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
        throw new Error(`${key} 必须在 ${min}–${max} 之间`)
    } else if (kind === 'edge' && ['dashed', 'arrow'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`${key} 必须为布尔值`)
    } else throw new Error(`未知样式字段：${key}`)
  }
}
export function resolveFlowchartTheme(
  preset: FlowchartPreset = 'ocean',
  overrides: FlowchartThemeOverrides = {}
): FlowchartTheme {
  const base = flowchartThemes[preset]
  if (!base) throw new Error(`未知流程图主题：${preset}`)
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('theme 必须为对象')
  const theme = structuredCopy(base)
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue
    if (['activity', 'decision', 'start', 'end', 'region', 'edge'].includes(key)) {
      validateStyle(value, key === 'region' ? 'region' : key === 'edge' ? 'edge' : 'shape')
      Object.assign(theme[key as 'activity'], clean(value as object))
    } else if (key === 'background' || key === 'fontFamily') {
      if (typeof value !== 'string' || !value.trim() || value.length > 200)
        throw new Error(`${key} 必须为非空字符串`)
      theme[key] = value
    } else if (key === 'fontSize') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 10 || value > 32)
        throw new Error('fontSize 必须在 10–32 之间')
      theme.fontSize = value
    } else throw new Error(`未知主题字段：${key}`)
  }
  for (const kind of ['activity', 'decision', 'start', 'end'] as const) {
    theme[kind].fontFamily = overrides[kind]?.fontFamily ?? theme.fontFamily
    theme[kind].fontSize = overrides[kind]?.fontSize ?? theme.fontSize
  }
  return theme
}
function clean(value: object) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export const defaultFlowchartOptions: FlowchartLayoutOptions = {
  maxNodesPerColumn: 5,
  nodeWidth: 220,
  columnGap: 64,
  rowGap: 54,
  regionGap: 56,
  padding: 40,
  optimizeAlignment: true,
  balanceRegions: true,
  terminalPlacement: 'aligned'
}
export function resolveFlowchartOptions(
  overrides: Partial<FlowchartLayoutOptions> = {}
): FlowchartLayoutOptions {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('布局参数必须为对象')
  const options = { ...defaultFlowchartOptions, ...clean(overrides) }
  const ranges = {
    maxNodesPerColumn: [1, 20],
    nodeWidth: [160, 360],
    columnGap: [48, 200],
    rowGap: [48, 200],
    regionGap: [48, 200],
    padding: [32, 120]
  }
  for (const [key, value] of Object.entries(options)) {
    if (key in ranges) {
      const [min, max] = ranges[key as keyof typeof ranges]!
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < min! ||
        value > max! ||
        !Number.isInteger(value)
      )
        throw new Error(`${key} 必须是 ${min}–${max} 的整数`)
    } else if (['optimizeAlignment', 'balanceRegions'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`${key} 必须为布尔值`)
    } else if (key === 'terminalPlacement') {
      if (!['aligned', 'left', 'auto'].includes(String(value)))
        throw new Error('terminalPlacement 必须为 aligned / left / auto')
    } else throw new Error(`未知布局参数：${key}`)
  }
  return options
}
