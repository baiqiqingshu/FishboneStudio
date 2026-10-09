import { layoutFishbone } from './layout'
import type { FishboneNode, FishbonePreset, FishboneTheme } from './types'
import { escapeXml } from './xml'
import { paintFishbone } from './paint'
export { escapeXml } from './xml'

/** Pure renderer; also usable in SSR without a DOM. */
export function renderFishboneSvg(
  data: FishboneNode,
  preset: FishbonePreset = 'ocean',
  custom: Partial<FishboneTheme> = {}
): string {
  const layout = layoutFishbone(data, preset, custom)
  const { width, height, theme } = layout
  const geometry = paintFishbone(layout)
  const labels = layout.labels
    .map(
      (l) =>
        `<text x="${l.x}" y="${l.y}" fill="${escapeXml(l.color)}" font-size="${l.size}" font-weight="${l.weight}" text-anchor="${l.anchor}">${l.lines.map((text, i) => `<tspan x="${l.x}" dy="${i === 0 ? 0 : l.size * 1.4}">${escapeXml(text)}</tspan>`).join('')}</text>`
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(data.label)}" style="display:block;max-width:100%;height:auto" font-family="${escapeXml(theme.fontFamily)}"><title>${escapeXml(data.label)} — 鱼骨图</title><rect data-background="true" width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>${geometry}${labels}</svg>`
}
