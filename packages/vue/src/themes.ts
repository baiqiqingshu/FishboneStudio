import type { FishbonePreset, FishboneTheme, ResolvedFishboneTheme } from './types'
import { fishboneAppearanceOptions } from './appearance'
export const fishboneThemes: Record<FishbonePreset, ResolvedFishboneTheme> = {
  ocean: {
    headStyle: 'fish',
    tailStyle: 'fork',
    spineStyle: 'tapered',
    boneStyle: 'curved',
    categoryStyle: 'fin',
    causeStyle: 'dot',
    background: '#ffffff',
    spineColor: '#334155',
    branchColors: ['#14a89a', '#6695e8', '#e5a049', '#b18bdd', '#e17c90', '#70a87b'],
    textColor: '#334155',
    mutedColor: '#94a3b8',
    headBackground: '#edf6f5',
    headTextColor: '#147d74',
    fontFamily: 'Inter, "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: 14,
    lineWidth: 2,
    nodeRadius: 10
  },
  classic: {
    headStyle: 'rounded',
    tailStyle: 'chevron',
    spineStyle: 'line',
    boneStyle: 'straight',
    categoryStyle: 'outline',
    causeStyle: 'underline',
    background: '#ffffff',
    spineColor: '#27272a',
    branchColors: ['#52525b', '#71717a', '#3f3f46', '#a1a1aa'],
    textColor: '#27272a',
    mutedColor: '#71717a',
    headBackground: '#f4f4f5',
    headTextColor: '#27272a',
    fontFamily: '"Microsoft YaHei", sans-serif',
    fontSize: 14,
    lineWidth: 2,
    nodeRadius: 3
  },
  forest: {
    headStyle: 'fish',
    tailStyle: 'fan',
    spineStyle: 'double',
    boneStyle: 'curved',
    categoryStyle: 'pill',
    causeStyle: 'dot',
    background: '#f8fcf7',
    spineColor: '#365b3c',
    branchColors: ['#4c8861', '#8fa654', '#3f8e88', '#b29a54', '#679869'],
    textColor: '#34533b',
    mutedColor: '#89a38a',
    headBackground: '#e4efdd',
    headTextColor: '#365b3c',
    fontFamily: '"Microsoft YaHei", sans-serif',
    fontSize: 14,
    lineWidth: 2.5,
    nodeRadius: 12
  },
  sunset: {
    headStyle: 'fish',
    tailStyle: 'crescent',
    spineStyle: 'tapered',
    boneStyle: 'tapered',
    categoryStyle: 'ribbon',
    causeStyle: 'card',
    background: '#fffbf7',
    spineColor: '#854b43',
    branchColors: ['#db7961', '#e8ac55', '#c67d99', '#a58cc1', '#c19c60'],
    textColor: '#704f4a',
    mutedColor: '#b99c94',
    headBackground: '#fbe4d9',
    headTextColor: '#9d533f',
    fontFamily: '"Microsoft YaHei", sans-serif',
    fontSize: 14,
    lineWidth: 2,
    nodeRadius: 18
  },
  midnight: {
    headStyle: 'shark',
    tailStyle: 'fork',
    spineStyle: 'vertebrae',
    boneStyle: 'jointed',
    categoryStyle: 'fin',
    causeStyle: 'card',
    background: '#18212e',
    spineColor: '#cbd5e1',
    branchColors: ['#5eead4', '#93c5fd', '#fcd34d', '#c4b5fd', '#fda4af', '#86efac'],
    textColor: '#e2e8f0',
    mutedColor: '#94a3b8',
    headBackground: '#26384a',
    headTextColor: '#b4f1e7',
    fontFamily: '"Microsoft YaHei", sans-serif',
    fontSize: 14,
    lineWidth: 2,
    nodeRadius: 10
  }
}
export function resolveTheme(
  preset: FishbonePreset = 'ocean',
  custom: Partial<FishboneTheme> = {}
): ResolvedFishboneTheme {
  const base = fishboneThemes[preset]
  if (!base) throw new Error(`未知样式：${preset}`)
  const overrides = Object.fromEntries(
    Object.entries(custom).filter(([, value]) => value !== undefined)
  ) as Partial<FishboneTheme>
  const colors = overrides.branchColors ?? base.branchColors
  if (
    !Array.isArray(colors) ||
    !colors.length ||
    colors.some((c) => typeof c !== 'string' || !c.trim())
  )
    throw new Error('branchColors 至少需要一种颜色')
  const theme = { ...base, ...overrides, branchColors: [...colors] }
  for (const key of Object.keys(
    fishboneAppearanceOptions
  ) as (keyof typeof fishboneAppearanceOptions)[]) {
    if (!(fishboneAppearanceOptions[key] as readonly unknown[]).includes(theme[key]))
      throw new Error(`${key} 不支持样式：${String(theme[key])}`)
  }
  for (const key of [
    'background',
    'spineColor',
    'textColor',
    'mutedColor',
    'headBackground',
    'headTextColor',
    'fontFamily'
  ] as const) {
    if (typeof theme[key] !== 'string' || !theme[key].trim())
      throw new Error(`${key} 必须是非空字符串`)
  }
  for (const key of ['fontSize', 'lineWidth', 'nodeRadius'] as const) {
    if (!Number.isFinite(theme[key]) || theme[key] < (key === 'nodeRadius' ? 0 : 0.1))
      throw new Error(`${key} 必须是有效正数`)
  }
  if (theme.fontSize > 40 || theme.lineWidth > 12 || theme.nodeRadius > 40)
    throw new Error('字体最大为 40，线宽最大为 12，圆角最大为 40')
  return theme
}
