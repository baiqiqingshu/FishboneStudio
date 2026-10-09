import { layoutFishbone } from './layout'
import type { FishboneNode, FishbonePreset, FishboneTheme } from './types'

export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!
    )
}

/** Pure renderer; also usable in SSR without a DOM. */
export function renderFishboneSvg(
  data: FishboneNode,
  preset: FishbonePreset = 'ocean',
  custom: Partial<FishboneTheme> = {}
): string {
  const layout = layoutFishbone(data, preset, custom)
  const { width, height, theme } = layout
  const lines = layout.lines
    .map(
      (l) =>
        `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${escapeXml(l.color)}" stroke-width="${l.width}" opacity="${l.opacity}" stroke-linecap="round"/>`
    )
    .join('')
  const boxes = layout.boxes
    .map(
      (b) =>
        `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.radius}" fill="${escapeXml(b.fill)}" stroke="${escapeXml(b.stroke)}" stroke-width="${theme.lineWidth * 0.7}"/>`
    )
    .join('')
  const labels = layout.labels
    .map(
      (l) =>
        `<text x="${l.x}" y="${l.y}" fill="${escapeXml(l.color)}" font-size="${l.size}" font-weight="${l.weight}" text-anchor="${l.anchor}">${l.lines.map((text, i) => `<tspan x="${l.x}" dy="${i === 0 ? 0 : l.size * 1.4}">${escapeXml(text)}</tspan>`).join('')}</text>`
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(data.label)}" style="display:block;max-width:100%;height:auto" font-family="${escapeXml(theme.fontFamily)}"><title>${escapeXml(data.label)} — 鱼骨图</title><rect data-background="true" width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>${lines}${boxes}${labels}</svg>`
}
