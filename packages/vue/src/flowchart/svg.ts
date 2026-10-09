import { escapeXml } from '../svg'
import { layoutFlowchart } from './layout'
import { wrapLabel } from '../layout'
import type {
  FlowchartData,
  FlowchartPreset,
  FlowchartThemeOverrides,
  FlowchartLayoutOptions,
  FlowchartPlacedNode,
  FlowchartPlacedEdge
} from './types'

function nodeSvg(placed: FlowchartPlacedNode): string {
  const { x, y, width, height, style, node, lines } = placed
  const cx = x + width / 2,
    cy = y + height / 2
  const attributes = `fill="${escapeXml(style.fill)}" stroke="${escapeXml(style.stroke)}" stroke-width="${style.lineWidth}"`
  let geometry: string
  if (node.type === 'decision')
    geometry = `<polygon points="${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}" ${attributes}/>`
  else if (node.shape === 'ellipse')
    geometry = `<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" ${attributes}/>`
  else
    geometry = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${node.type === 'start' || node.type === 'end' ? height / 2 : style.radius}" ${attributes}/>`
  const textY = cy - (lines.length - 1) * style.fontSize * 0.725 + style.fontSize * 0.35
  const label = `<text x="${cx}" y="${textY}" text-anchor="middle" fill="${escapeXml(style.textColor)}" font-family="${escapeXml(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${style.fontWeight}">${lines.map((line, i) => `<tspan x="${cx}" dy="${i ? style.fontSize * 1.45 : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`
  return `<g data-node-id="${escapeXml(node.id)}" data-node-type="${node.type}"><title>${escapeXml(node.label)}</title>${geometry}${label}</g>`
}
function edgeSvg(edge: FlowchartPlacedEdge): string {
  const { points, style } = edge
  let arrow = ''
  if (style.arrow && points.length > 1) {
    const tip = points.at(-1)!,
      previous = points.at(-2)!,
      size = 7 + style.lineWidth
    const dx = Math.sign(tip.x - previous.x),
      dy = Math.sign(tip.y - previous.y)
    const baseX = tip.x - dx * size,
      baseY = tip.y - dy * size
    arrow = `<polygon points="${tip.x},${tip.y} ${baseX + dy * size * 0.45},${baseY - dx * size * 0.45} ${baseX - dy * size * 0.45},${baseY + dx * size * 0.45}" fill="${escapeXml(style.stroke)}"/>`
  }
  return `<g data-edge-source="${escapeXml(edge.edge.source)}" data-edge-target="${escapeXml(edge.edge.target)}"><path d="${points.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')}" fill="none" stroke="${escapeXml(style.stroke)}" stroke-width="${style.lineWidth}" stroke-linejoin="round" stroke-linecap="round"${style.dashed ? ' stroke-dasharray="6 5"' : ''}/>${arrow}</g>`
}
/** Standalone SVG renderer; supports SSR and the shared PNG/JPEG/WebP/SVG exporter. */
export function renderFlowchartSvg(
  data: FlowchartData,
  preset: FlowchartPreset = 'ocean',
  theme: FlowchartThemeOverrides = {},
  options: Partial<FlowchartLayoutOptions> = {}
): string {
  const layout = layoutFlowchart(data, preset, theme, options)
  const title = data.title ?? '流程图'
  const regions = layout.regions
    .map((region) => {
      const x = region.x + 22,
        titleY = region.y + 30
      return `<g data-region-id="${escapeXml(region.region.id)}"><rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" rx="16" fill="${escapeXml(region.style.fill)}" stroke="${escapeXml(region.style.stroke)}" stroke-width="1"/><rect x="${x}" y="${region.y + 18}" width="3" height="17" rx="1.5" fill="${escapeXml(region.style.titleColor)}" opacity=".55"/><text x="${x + 12}" y="${titleY}" font-size="16" font-weight="600" fill="${escapeXml(region.style.titleColor)}">${region.titleLines.map((line, i) => `<tspan x="${x + 12}" dy="${i ? 23 : 0}">${escapeXml(line)}</tspan>`).join('')}</text>${region.descriptionLines.length ? `<text x="${x}" y="${titleY + region.titleLines.length * 23}" font-size="12" fill="${escapeXml(region.style.textColor)}">${region.descriptionLines.map((line, i) => `<tspan x="${x}" dy="${i ? 18 : 0}">${escapeXml(line)}</tspan>`).join('')}</text>` : ''}</g>`
    })
    .join('')
  const labels = layout.edges
    .filter((edge) => edge.label)
    .map((edge) => {
      const label = edge.label!,
        cx = label.x + label.width / 2
      return `<g data-edge-label="${escapeXml(edge.edge.label!)}"><rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="5" fill="${escapeXml(layout.theme.background)}" stroke="${escapeXml(layout.theme.region.stroke)}" stroke-width=".7"/><text x="${cx}" y="${label.y + 16}" font-size="12" text-anchor="middle" fill="${escapeXml(edge.style.textColor)}">${label.lines.map((line, i) => `<tspan x="${cx}" dy="${i ? 17 : 0}">${escapeXml(line)}</tspan>`).join('')}</text></g>`
    })
    .join('')
  const heading = data.title
    ? `<text data-flow-title="true" x="${layout.options.padding}" y="${layout.options.padding + 18}" font-size="18" font-weight="600" fill="${escapeXml(layout.theme.region.titleColor)}">${wrapLabel(
        data.title,
        layout.width - layout.options.padding * 2,
        18
      )
        .map(
          (line, i) =>
            `<tspan x="${layout.options.padding}" dy="${i ? 26 : 0}">${escapeXml(line)}</tspan>`
        )
        .join('')}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(title)}" style="display:block;max-width:100%;height:auto" font-family="${escapeXml(layout.theme.fontFamily)}"><title>${escapeXml(title)} — 流程图</title><rect data-background="true" width="${layout.width}" height="${layout.height}" fill="${escapeXml(layout.theme.background)}"/>${heading}${regions}${layout.edges.map(edgeSvg).join('')}${layout.nodes.map(nodeSvg).join('')}${labels}${!data.nodes.length ? `<text x="${layout.width / 2}" y="${layout.height / 2}" text-anchor="middle" fill="${escapeXml(layout.theme.region.textColor)}">暂无节点，请添加活动或判断</text>` : ''}</svg>`
}
